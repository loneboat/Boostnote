var React = require('react/addons')
var ReactRouter = require('react-router')

var PlanetHeader = require('../Components/PlanetHeader')
var PlanetNavigator = require('../Components/PlanetNavigator')
var PlanetArticleList = require('../Components/PlanetArticleList')
var PlanetArticleDetail = require('../Components/PlanetArticleDetail')
var ModalBase = require('../Components/ModalBase')
var LaunchModal = require('../Components/LaunchModal')
var SnippetEditModal = require('../Components/SnippetEditModal')
var SnippetDeleteModal = require('../Components/SnippetDeleteModal')
var BlueprintEditModal = require('../Components/BlueprintEditModal')
var BlueprintDeleteModal = require('../Components/BlueprintDeleteModal')

var PlanetActions = require('../Actions/PlanetActions')

var AuthStore = require('../Stores/AuthStore')
var PlanetStore = require('../Stores/PlanetStore')

var searchArticle = function (search, articles) {
  if (search === '' || search == null) return articles
  var firstFiltered = articles.filter(function (article) {

    var first = article.type === 'snippet' ? article.callSign : article.title
    if (first.match(new RegExp(search, 'i'))) return true

    return false
  })

  var secondFiltered = articles.filter(function (article) {
    var second = article.type === 'snippet' ? article.description : article.content
    if (second.match(new RegExp(search, 'i'))) return true

    return false
  })

  var thirdFiltered = articles.filter(function (article) {
    if (article.type === 'snippet') {
      if (article.content.match(new RegExp(search, 'i'))) return true
    }
    return false
  })

  return firstFiltered.concat(secondFiltered, thirdFiltered).filter(function (value, index, self) {
    return self.indexOf(value) === index
  })
}

module.exports = React.createClass({
  mixins: [ReactRouter.Navigation, ReactRouter.State],
  propTypes: {
    params: React.PropTypes.object,
    planetName: React.PropTypes.string
  },
  getInitialState: function () {
    return {
      currentPlanet: null,
      filteredArticles: [],
      search: '',
      isFetched: false
    }
  },
  componentDidMount: function () {
    this.unsubscribe = PlanetStore.listen(this.onFetched)

    PlanetActions.fetchPlanet(this.props.params.userName + '/' + this.props.params.planetName)
    document.addEventListener('keydown', this.handleKeyDown)
  },
  componentWillUnmount: function () {
    this.unsubscribe()
    document.removeEventListener('keydown', this.handleKeyDown)
  },
  getFilteredIndexOfCurrentArticle: function () {
    var params = this.props.params
    var index = 0

    if (this.isActive('snippets')) {
      this.refs.list.props.articles.some(function (_article, _index) {
        if (_article.type === 'snippet' && _article.localId === parseInt(params.localId, 10)) {
          index = _index
        }
      })
    } else if (this.isActive('blueprints')) {
      this.refs.list.props.articles.some(function (_article, _index) {
        if (_article.type === 'blueprint' && _article.localId === parseInt(params.localId, 10)) {
          index = _index
          return true
        }
        return false
      })
    }

    return index
  },
  getIndexOfCurrentArticle: function () {
    var params = this.props.params
    var index = 0

    if (this.isActive('snippets')) {
      this.state.currentPlanet.Articles.some(function (_article, _index) {
        if (_article.type === 'snippet' && _article.localId === parseInt(params.localId, 10)) {
          index = _index
        }
      })
    } else if (this.isActive('blueprints')) {
      this.state.currentPlanet.Articles.some(function (_article, _index) {
        if (_article.type === 'blueprint' && _article.localId === parseInt(params.localId, 10)) {
          index = _index
          return true
        }
        return false
      })
    }

    return index
  },
  selectArticleByIndex: function (index) {
    var article = this.refs.list.props.articles[index]
    var params = this.props.params

    if (article == null) {
      this.transitionTo('planetHome', params)
      return
    }

    if (article.type === 'snippet') {
      params.localId = article.localId
      this.transitionTo('snippets', params)
      return
    }

    if (article.type === 'blueprint') {
      params.localId = article.localId
      this.transitionTo('blueprints', params)
      return
    }
  },
  selectNextArticle: function () {
    if (this.state.currentPlanet == null || this.state.filteredArticles.length === 0) return

    var index = this.getFilteredIndexOfCurrentArticle()

    if (index < this.state.filteredArticles.length - 1) {
      this.selectArticleByIndex(index + 1)
    }
  },
  selectPriorArticle: function () {
    if (this.state.currentPlanet == null || this.state.filteredArticles.length === 0) {
      return
    }
    var index = this.getFilteredIndexOfCurrentArticle()

    if (index > 0) {
      this.selectArticleByIndex(index - 1)
    } else {
      React.findDOMNode(this).querySelector('.PlanetHeader .searchInput input').focus()
    }
  },
  onFetched: function (res) {
    var articles = this.state.currentPlanet == null ? null : this.state.currentPlanet.Articles

    if (res.status === 'planetFetched') {
      var planet = res.data
      this.setState({isFetched: true, currentPlanet: planet, filteredArticles: planet.Articles}, function () {
        if (this.state.filteredArticles.length > 0) {
          if (this.props.params.localId == null) {
            var article = this.state.filteredArticles[0]
            if (article == null) return
            this.transitionTo(article.type === 'snippet' ? 'snippets' : 'blueprints', {
              userName: this.props.params.userName,
              planetName: this.props.params.planetName,
              localId: planet.Articles[0].localId
            })
            return
          }
          if (this.isActive('snippets')) {
            this.transitionTo('snippets', {
              userName: this.props.params.userName,
              planetName: this.props.params.planetName,
              localId: this.props.params.localId == null ? planet.Articles[0].localId : this.props.params.localId
            })
          } else if (this.isActive('blueprints')) {
            this.transitionTo('blueprints', {
              userName: this.props.params.userName,
              planetName: this.props.params.planetName,
              localId: this.props.params.localId == null ? planet.Articles[0].localId : this.props.params.localId
            })
          }
        }
      })
      return
    }

    var article = res.data
    var filteredIndex = this.getFilteredIndexOfCurrentArticle()
    var index = this.getIndexOfCurrentArticle()

    if (article.PlanetId === this.state.currentPlanet.id) {
      switch (res.status) {
        case 'articleCreated':
          articles.unshift(article)

          this.setState({planet: this.state.currentPlanet, search: ''}, function () {
            this.selectArticleByIndex(0)
          })
          break
        case 'articleUpdated':
          articles.splice(index, 1)
          articles.unshift(article)

          this.setState({planet: this.state.currentPlanet})
          break
        case 'articleDeleted':
          articles.splice(index, 1)

          this.setState({planet: this.state.currentPlanet}, function () {
            this.closeDeleteModal()
            if (index > 0) {
              this.selectArticleByIndex(filteredIndex - 1)
            } else {
              this.selectArticleByIndex(filteredIndex)
            }
          })
      }
    }
  },
  handleSearchChange: function (e) {
    this.setState({search: e.target.value}, function () {
      this.selectArticleByIndex(0)
    })
  },
  openLaunchModal: function () {
    this.setState({isLaunchModalOpen: true})
  },
  closeLaunchModal: function () {
    this.setState({isLaunchModalOpen: false})
  },
  openEditModal: function () {
    this.setState({isEditModalOpen: true})
  },
  closeEditModal: function () {
    this.setState({isEditModalOpen: false})
  },
  submitEditModal: function () {
    this.setState({isEditModalOpen: false})
  },
  openDeleteModal: function () {
    this.setState({isDeleteModalOpen: true})
  },
  closeDeleteModal: function () {
    this.setState({isDeleteModalOpen: false})
  },
  submitDeleteModal: function () {
    this.setState({isDeleteModalOpen: false})
  },
  handleKeyDown: function (e) {
    // Bypath for modal open state
    if (this.state.isLaunchModalOpen) {
      if (e.keyCode === 27) this.closeLaunchModal()
      return
    }
    if (this.state.isEditModalOpen) {
      if (e.keyCode === 27) this.closeEditModal()
      return
    }
    if (this.state.isDeleteModalOpen) {
      if (e.keyCode === 27) this.closeDeleteModal()
      return
    }

    // LaunchModal
    if ((e.keyCode === 13 && e.metaKey)) {
      e.preventDefault()
      this.openLaunchModal()
    }

    // Focus(blur) search input
    var searchInput = React.findDOMNode(this).querySelector('.PlanetHeader .searchInput input')

    if (document.activeElement === searchInput) {
      switch (e.keyCode) {
        case 38:
          searchInput.blur()
          break
        case 40:
          e.preventDefault()
          searchInput.blur()
          break
        case 27:
          e.preventDefault()
          searchInput.blur()
          break
      }
      return
    }

    // Article indexing
    if (document.activeElement !== searchInput) {
      switch (e.keyCode) {
        case 38:
          e.preventDefault()
          this.selectPriorArticle()
          break
        case 40:
          e.preventDefault()
          this.selectNextArticle()
          break
        case 27:
          searchInput.focus()
          break
      }

      // Other hotkeys
      switch (e.keyCode) {
        case 65:
          e.preventDefault()
          this.openLaunchModal()
          break
        case 68:
          e.preventDefault()
          this.openDeleteModal()
          break
        case 69:
          e.preventDefault()
          this.openEditModal()
      }
    }

  },
  render: function () {
    var user = AuthStore.getUser()
    if (user == null) return (<div/>)
    if (this.state.currentPlanet == null) return (<div/>)

    var localId = parseInt(this.props.params.localId, 10)

    var article
    if (this.isActive('snippets')) {
      this.state.currentPlanet.Articles.some(function (_article) {
        if (_article.type === 'snippet' && localId === _article.localId) {
          article = _article
          return true
        }
        return false
      })
    } else if (this.isActive('blueprints')) {
      this.state.currentPlanet.Articles.some(function (_article) {
        if (_article.type === 'blueprint' && localId === _article.localId) {
          article = _article
          return true
        }
        return false
      })
    }

    var filteredArticles = this.state.isFetched ? searchArticle(this.state.search, this.state.currentPlanet.Articles) : []

    var content = article != null ? (
      <PlanetArticleDetail article={article} onOpenEditModal={this.openEditModal} onOpenDeleteModal={this.openDeleteModal}/>
    ) : (
      <div className='PlanetArticleDetail'>Nothing selected</div>
    )

    var editModal = article != null ? (article.type === 'snippet' ? (
      <SnippetEditModal snippet={article} submit={this.submitEditModal} close={this.closeEditModal}/>
    ) : (
      <BlueprintEditModal blueprint={article} submit={this.submitEditModal} close={this.closeEditModal}/>
    )) : null

    var deleteModal = article != null ? (article.type === 'snippet' ? (
      <SnippetDeleteModal snippet={article} close={this.closeDeleteModal}/>
    ) : (
      <BlueprintDeleteModal blueprint={article} close={this.closeDeleteModal}/>
    )) : null

    return (
      <div className='PlanetContainer'>
        <ModalBase isOpen={this.state.isLaunchModalOpen} close={this.closeLaunchModal}>
          <LaunchModal submit={this.submitLaunchModal} close={this.closeLaunchModal}/>
        </ModalBase>

        <ModalBase isOpen={this.state.isEditModalOpen} close={this.closeEditModal}>
          {editModal}
        </ModalBase>

        <ModalBase isOpen={this.state.isDeleteModalOpen} close={this.closeDeleteModal}>
          {deleteModal}
        </ModalBase>

        <PlanetHeader search={this.state.search} onSearchChange={this.handleSearchChange} currentPlanet={this.state.currentPlanet} currentUser={user}/>

        <PlanetNavigator onOpenLaunchModal={this.openLaunchModal} currentPlanet={this.state.currentPlanet} currentUser={user}/>

        <PlanetArticleList ref='list' articles={filteredArticles}/>
        {content}
      </div>
    )
  }
})