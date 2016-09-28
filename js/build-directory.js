/*****************  DataDirectory  *****************/
/*****************  DataDirectory  *****************/
/*****************  DataDirectory  *****************/


// TODO: Remove this when query vars are implemented
var flQueryVars = {};


var messageTimeout,
  loadingTimeout,
  messageDelay = 5000,        // "Loading..." text delay to display
  loadingOverlayDelay = 1000; // Time it takes to display the loading overlay after a click

var DataDirectory = function ( data, config ) {
  this.data = data;
  this.config = $.extend({
    is_alphabetical : false,
    alphabetical_field : "",
    label_template : "",
    data_fields : [],
    filter_fields : [],
    search_fields : [],
    detail_fields : [],
    field_types : "" // Formatted as a JSON string to avoid invalid key characters (e.g. "?'#") violating CodeIgniter security
  }, config);
  this.deviceIsTablet = ( window.innerWidth >= 640 );
  this.navHeight = $('#main-header').height();
  this.searchBarHeight = $('#directory-search').outerHeight();
  this.directoryMode = $('#data-directory').attr('data-mode');
  this.filterOverlay = null;
  this.entryOverlay = null;
  this.searchResultData = [];
  this.supportLiveSearch = this.data.length <= 500;
  this.liveSearchInterval = 200;

  if ( typeof this.config.is_alphabetical === 'string' ) {
    this.config.is_alphabetical = this.config.is_alphabetical.toLowerCase().trim() === 'true';
  }

  if ( typeof this.config.field_types === 'string' && this.config.field_types.length ) {
    this.config.field_types = JSON.parse(this.config.field_types);
  }

  if (this.data.length) {
    this.initialiseHandlebars();
    this.init();
    this.attachObservers();
    this.parseQueryVars();
  } else {
    this.directoryNotConfigured();
  }

  return this;
};

DataDirectory.prototype.initialiseHandlebars = function(){
  var _this = this;

  var lastAlphabetIndex = '';

  Handlebars.registerHelper('alphabet_divider', function(){
    if (!_this.config.is_alphabetical) return '';

    var entryTitleTemplate = Handlebars.compile( "{{["+_this.config.alphabetical_field+"]}}" );
    var firstCharacterOfTitle = entryTitleTemplate( this )[0].toUpperCase();
    if ( "1234567890".indexOf(firstCharacterOfTitle) > -1 ) firstCharacterOfTitle = '#';
    if ( firstCharacterOfTitle !== lastAlphabetIndex ) {
      lastAlphabetIndex = firstCharacterOfTitle;
      return Handlebars.templates.directoryListDivider(firstCharacterOfTitle);
    }
  });

  Handlebars.registerHelper('search_result_header', function( data ){
    var output = '';

    switch (data.type) {
      case 'filter':
        output += 'Filtered by ';
        output += '<strong>' + data.value + '</strong>';
        break;
      case 'search':
        output += 'Search results';
        break;
    }

    return output;
  });

  Handlebars.registerHelper('search_result_clear', function( data ){
    switch (data.type) {
      case 'filter':
        return 'Clear filter';
        break;
      case 'search':
        return 'Clear search results';
        break;
      default:
        return 'Clear result'
        break;
    }
  });

  Handlebars.registerPartial('entry_title', this.config.label_template.replace(/{{/g, "{{[").replace(/}}/g, "]}}"));

  if (this.config.hasOwnProperty('subtitle')) {
    Handlebars.registerPartial('entry_subtitle', this.config.subtitle.replace(/{{/g, "{{[").replace(/}}/g, "]}}"));
  }

  if (this.config.hasOwnProperty('tags_field')) {
    Handlebars.registerHelper('entry_tags', function (entry) {
      var tags = entry[_this.config.tags_field];
      if (!tags) {
        return '';
      }
      var splitTags = tags.split(",");
      return new Handlebars.SafeString(
        splitTags.map(function (tag) {
          tag = tag.trim();
          if (tag !== '') {
            return '<a class="data-linked" data-type="filter-value-tag" data-value="' + tag + '" data-filter="' + _this.config.tags_field + '" href="#">' + tag + '</a>';
          }

          return '';
        }).join(', ')
      );
    });
  }

  Handlebars.registerPartial('directory_filter_values', $('#directory-filter-value-template').html());
};

DataDirectory.prototype.init = function(){
  // Function to run before rendering the directory UI.
  if (typeof this.config.before_init === 'function') {
    this.data = this.config.before_init(JSON.parse(JSON.stringify(this.data)));
  }

  this.verifyConfig();
  this.renderEntries();
  this.renderFilters();

  // Custom event to fire after the directory list is rendered.
  var flDirectoryListRendered = new CustomEvent(
    "flDirectoryListRendered",
    {
      bubbles: true,
      cancelable: true
    }
  );
  document.dispatchEvent(flDirectoryListRendered);
};

DataDirectory.prototype.verifyFields = function(fieldConfig){
  if ( this.config[fieldConfig].constructor.name !== 'Array' ) return;

  var arr = [];
  for ( var i = 0, l = this.config[fieldConfig].length; i < l; i++ ) {
    if ( this.config.data_fields.indexOf( this.config[fieldConfig][i] ) > -1 ) {
      arr.push( this.config[fieldConfig][i] );
    }
  }
  this.config[fieldConfig] = arr;
};

DataDirectory.prototype.verifyConfig = function(){
  this.verifyFields('filter_fields');
  this.verifyFields('search_fields');
  this.verifyFields('detail_fields');
};

DataDirectory.prototype.renderEntries = function(){
  var _this = this;
  var listData = [];

  if ( !this.config.is_alphabetical ) {
    listData = this.data;
  } else {
    listData = this.data.sort( function(a,b){
      var attr = _this.config.alphabetical_field;
      if (a[attr].toUpperCase() < b[attr].toUpperCase())
        return -1;
      if (a[attr].toUpperCase() > b[attr].toUpperCase())
        return 1;
      return 0;
    } );
    $('#directory-entries').addClass('list-index-enabled');
  }
  this.data = listData;

  var directoryListHTML = Handlebars.templates.directoryListEntries({
    show_subtitle: this.config.show_subtitle ? this.config.show_subtitle : false,
    show_tags: this.config.show_tags ? this.config.show_tags : false,
    entries: this.data
  });

  $('#directory-entries').html(directoryListHTML);
  this.renderIndexList();
};

DataDirectory.prototype.renderIndexList = function(){
  if ( !this.config.is_alphabetical ) return;

  $('#directory-entries').after('<div class="list-index"></div>');
  var $listIndex = $('#directory-entries + .list-index');
  $('#directory-entries .divider').each(function(){
    var letter = $(this).text();
    $listIndex.append('<span data-letter="' + letter + '">' + letter + '</span>');
  });

  $(document).on(  'touchstart mousedown', '.list-index span', $.proxy( this.listIndexTouchStart, this ) )
    .on( 'touchmove  mousemove', '.list-index span', $.proxy( this.listIndexTouchMove , this ) )
    .on( 'touchend   mouseup'  , '.list-index span', $.proxy( this.listIndexTouchEnd  , this ) );
};

DataDirectory.prototype.scrollToLetter = function(letter){
  var scrollToEl = $('.divider[data-letter="' + letter + '"]');
  if (!scrollToEl.length) return;
  var scrollTop = scrollToEl.offset().top + $('#directory-entries').scrollTop() - this.searchBarHeight - this.navHeight;
  $('#directory-entries')[0].scrollTop = scrollTop;
  flWebviewRedraw();
};

DataDirectory.prototype.listIndexTouchStart = function(e){
  e.preventDefault();
  this.listIndexIsTouched = true;

  var $target = $(e.target);
  this.scrollToLetter($target.data('letter'));
};

DataDirectory.prototype.listIndexTouchMove = function(e){
  if (!this.listIndexIsTouched) return;
  e.preventDefault();
  var $target;
  if (e.type === 'mousemove') {
    $target = $(e.target);
  } else {
    e = e.originalEvent;
    $target = $(document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY));
  }

  this.scrollToLetter($target.data('letter'));
};

DataDirectory.prototype.listIndexTouchEnd = function(e){
  this.listIndexIsTouched = false;
};

DataDirectory.prototype.renderFilters = function(){

  if ( this.config.filter_fields.length ) {
    // 1 or more filter fields configured
    var directoryFilterHTML = Handlebars.templates.directoryFilter(this.config.filter_fields);
    $('#filter-list').html(directoryFilterHTML);
  } else {
    // No filter field configured
    $('#search').attr('placeholder','Search');
    $('#filters').remove();
  }

};

DataDirectory.prototype.renderFilterValues = function( filter, inOverlay ){
  if ( typeof inOverlay == 'undefined' ) inOverlay = false;

  var _this = this,
    tags_field = this.config.tags_field ? this.config.tags_field : '',
    values = [],
    data;

  // Check if it's the tag filter
  if (tags_field === filter) {
    this.data.forEach(function (record) {
      var entryTags = record[tags_field].split(',');
      entryTags.forEach(function(tag) {
        tag = tag.trim();
        if (tag !== "" && values.indexOf(tag) === -1) {
          values.push(tag);
        }
      });
    });

    values = values.sort(sortAlphabetically);
  } else {
    values = this.getFilterValues( filter );
  }

  data = { filter : filter.trim(), values : values, dataType: (tags_field === filter) ? 'filter-value-tag' : 'filter-value'};

  if ( inOverlay ) {
    var directoryFilterOverlayTemplate = Handlebars.compile( $('#directory-filter-overlay-template').html() );
    var overlayContent = directoryFilterOverlayTemplate( data );
    this.filterOverlay = new Overlay(overlayContent,{
      title: 'Filter by ' + filter,
      showOnInit: true,
      entranceAnim: 'bounceInUp',
      exitAnim: 'bounceOutDown',
      closeText: 'Cancel',
      afterClose: function(){
        _this.filterOverlay = null;
      }
    });
  } else {
    var directoryFilterValueTemplate = Handlebars.compile( $('#directory-filter-value-template').html() );
    var directoryFilterValuesHTML = directoryFilterValueTemplate( data );
    $('#filter-value-list').html(directoryFilterValuesHTML);
    $('#filter-selected').html(filter);
    $('#directory-filters')[0].scrollTop = 0;
    this.switchMode('filter-values');
  }
};

DataDirectory.prototype.switchMode = function(mode){
  /*
   * Modes: default, search, search-result, filter-values
   */

  var validModes = ['default', 'search', 'search-result', 'search-result-entry', 'filter-values'];
  mode = mode.trim().toLowerCase();

  if ( validModes.indexOf(mode) < 0 ) {
    mode = 'default';
  }

  $('#data-directory').attr('data-mode',mode);

  if ( mode === 'search' ) {
    this.searchResultData = [];
    if ( this.config.filter_fields.length === 1 ) {
      this.renderFilterValues( this.config.filter_fields[0] );
    }
  }

  this.resizeSearch();
  this.directoryMode = mode;

  this.flViewportRedraw();
};

DataDirectory.prototype.isMode = function(mode){
  return this.directoryMode === mode;
};

DataDirectory.prototype.attachObservers = function(){
  var _this = this;

  $(document).on( 'click', '.data-linked', $.proxy( this.dataLinkClicked, this ) );
  $(window).on( 'resize', function(){
    _this.deviceIsTablet = window.innerWidth >= 640;
    _this.resizeSearch();
    _this.navHeight = $('#main-header').height();
    _this.searchBarHeight = $('#directory-search').outerHeight();
  } );
  $('#directory-search').on( 'click', function(){
    // GA Track event
    // window.plugins.ga.trackEvent("directory", "search");

    $('#search').trigger( 'focus' );
  } ).on( 'submit', function(e){
    e.preventDefault();
    _this.renderSearchResult( {
      type: 'search',
      value: $('#search').val()
    } );
  } );
  $('#search').on( 'focus', $.proxy( this.activateSearch, this ) );
  if ( this.supportLiveSearch ) {
    $('#search').on( 'keydown paste input', function(e){
      _this.renderLiveSearch($(this).val());
    } );
  }
  $(document).on( 'click', '#search-cancel', function(){
    $('#search').val('');
    _this.deactivateSearch();
    return false;
  } );
  $(document).on( 'click', '#search-result-clear', function(){
    $('#search').val('');
    _this.switchMode('search');
    return false;
  } );

  $(document).on( 'touchmove', '#search-result ul, #filters', function(){
    $('#search').trigger('blur');
  } );

  document.addEventListener("flDirectoryEntryBeforeRender", function () {
    _this.disableClicks();
    loadingTimeout = setTimeout(function () {
      _this.addLoading();
    }, loadingOverlayDelay);
  }, false);

  document.addEventListener("flDirectoryEntryAfterRender", function () {
    _this.removeLoading();
  }, false);
};

DataDirectory.prototype.activateSearch = function(){
  if ( this.isMode('default') ) {
    $('#filter-selected').html('');
  }
  if ( !this.isMode('search') && !this.isMode('filter-values') && !this.isMode('search-result') && !this.isMode('search-result-entry') ) {
    this.switchMode('search');
  }

  this.flViewportRedraw();
};

DataDirectory.prototype.deactivateSearch = function(){
  $('#search').trigger('blur');
  if ( this.deviceIsTablet && this.isMode('search-result-entry') ) {
    this.openDataEntry(0, 'entry', false);
  }
  this.switchMode('default');

  this.flViewportRedraw();
};

DataDirectory.prototype.resizeSearch = function(){
  var _this = this;
  setTimeout(function(){
    if ( _this.isMode('search') || _this.isMode('filter-values') || _this.isMode('search-result') || _this.isMode('search-result-entry') ) {
      $('#search').css( 'width', $('#directory-search').width() - $('#search-cancel').outerWidth() + 8 );
    } else {
      $('#search').css( 'width', '' );
    }
  }, 0);
};

DataDirectory.prototype.filterOverlayIsActive = function(){
  return this.filterOverlay instanceof Overlay;
};

DataDirectory.prototype.entryOverlayIsActive = function(){
  return this.entryOverlay instanceof Overlay;
};

DataDirectory.prototype.dataLinkClicked = function(e){

  this.flViewportRedraw();

  var _this = this;
  e.preventDefault();

  switch (e.currentTarget.dataset.type) {
    case 'filter-tag':
    case 'filter':
      var filter = e.currentTarget.dataset.filter;
      this.renderFilterValues( filter, !this.deviceIsTablet );
      break;
    case 'filter-value-tag':
      e.stopPropagation();
    case 'filter-value':
      this.renderSearchResult( {
        type: e.currentTarget.dataset.type,
        field: e.currentTarget.dataset.filter,
        value: e.currentTarget.dataset.value
      }, function(){
        if ( _this.filterOverlayIsActive() ) {
          _this.filterOverlay.close();
        }
        if ( _this.entryOverlayIsActive() ) {
          _this.entryOverlay.close();
        }
      } );
      break;
    case 'entry':
    case 'search-result-entry':
    default:
      this.openDataEntry(e.currentTarget.dataset.index, e.currentTarget.dataset.type);
      break;
  }
};

DataDirectory.prototype.openDataEntry = function(entryIndex, type, trackEvent){
  var _this = this;

  if ( typeof type === 'undefined' ) type = 'entry';
  if ( typeof trackEvent === 'undefined' ) trackEvent = true;

  var $entry = $('li[data-type="' + type + '"][data-index=' + entryIndex + '] .list-title');
  var title = $entry.text().trim();
  var detailData = {
    title : title,
    has_thumbail : false,
    fields : []
  };

  if (typeof this.config.thumbnail_field !== 'undefined' && this.config.thumbnail_field.trim() !== '') {
    detailData['has_thumbnail'] = true;
    detailData['thumbnail'] = (type == 'search-result-entry') ? this.searchResultData[entryIndex][this.config.thumbnail_field] : this.data[entryIndex][this.config.thumbnail_field];
  }

  for (var fieldIndex = 0, l = this.config.detail_fields.length; fieldIndex < l; fieldIndex++) {
    var fieldObj = this.getEntryField( entryIndex, fieldIndex, type );
    if (fieldObj.value.length) {
      detailData.fields.push( fieldObj );
    }
  }
  
  var detailHTML = Handlebars.templates.directoryDetails(detailData);

  if ( type === 'search-result-entry' ) {
    this.switchMode('search-result-entry');
  }

  // Custom event to fire before an entry is rendered in the detailed view.
  var flDirectoryEntryBeforeRender = new CustomEvent(
    "flDirectoryEntryBeforeRender",
    {
      bubbles: true,
      cancelable: true,
      detail: {
        detailData: detailData
      }
    }
  );
  document.dispatchEvent(flDirectoryEntryBeforeRender);

  var after_render = function() {
    // Link taps listeners
    $(".directory-detail-value a").not(".data-linked").on("click", function(e){
      if ($(e.target).attr("href").indexOf("mailto") === 0) {
        // GA Track event
        // window.plugins.ga.trackEvent("directory", "entry_email", title);
      } else if ($(e.target).attr("href").indexOf("tel") === 0) {
        // GA Track event
        // window.plugins.ga.trackEvent("directory", "entry_phone", title);
      } else {
        // GA Track event
        // window.plugins.ga.trackEvent("directory", "entry_url", title);
      }
    });
    $(".directory-detail-value a.data-linked").on("click", function(e){
      var filterType = (typeof $(e.target).data("type") !== "undefined") ? $(e.target).data("type") : "";
      var filterValue = (typeof $(e.target).data("value") !== "undefined") ? $(e.target).data("value") : "";

      // GA Track event
      // window.plugins.ga.trackEvent("directory", "entry_filter", filterType + ": " + filterValue);
    });

    // Custom event to fire after an entry is rendered in the detailed view.
    var flDirectoryEntryAfterRender = new CustomEvent(
      "flDirectoryEntryAfterRender",
      {
        bubbles: true,
        cancelable: true,
        detail: {
          detailData: detailData
        }
      }
    );
    document.dispatchEvent(flDirectoryEntryAfterRender);
  };

  // Function to run before rendering the entry
  if (typeof this.config.before_render_entry === 'function') {
    detailHTML = this.config.before_render_entry(detailData, detailHTML);
  }

  if ( this.deviceIsTablet ) {
    $('#directory-details .directory-details-content').html(detailHTML);
    after_render();
    setTimeout(function(){
      $('li[data-type=' + type + '].active').removeClass('active');
      $entry.addClass('active');
    },0);
  } else {
    this.entryOverlay = new Overlay( detailHTML, {
      showOnInit : true,
      entranceAnim : 'bounceInDown',
      exitAnim : 'bounceOutUp',
      afterOpen: after_render,
      afterClose: function(){
        _this.entryOverlay = null;
      }
    } );
  }

  // GA Track event
  if (trackEvent) {
    // window.plugins.ga.trackEvent('directory', "entry_open", title);
  }
};

DataDirectory.prototype.disableClicks = function () {
  $('#directory-list, #directory-details').addClass('disabled'); // Disables List
};

// Function that will fade in the loading overlay
DataDirectory.prototype.addLoading = function () {
  // The following adds Loading Overlay to a specific area depending on the device width
  if (this.deviceIsTablet) {
    $('#directory-details').find('.directory-loading').fadeIn(400);
  } else {
    $('#directory-list').find('.directory-loading').fadeIn(400);
  }

  // Delay to display the "Loading..." text
  messageTimeout = setTimeout(function () {
    $('.directory-loading .loading-text').hide().text("Loading...").fadeIn(250);
  }, messageDelay);
};

// Function that will remove the loading overlay and enable clicks
DataDirectory.prototype.removeLoading = function () {
  clearTimeout(loadingTimeout); // Clears delay loading overlay
  clearTimeout(messageTimeout); // Clears delay for text to appear
  // The following removes Loading Overlay from a specific area depending on the device width
  if (this.deviceIsTablet) {
    $('#directory-details').find('.directory-loading').fadeOut(400);
  } else {
    $('#directory-list').find('.directory-loading').fadeOut(400);
  }

  $('#directory-list, #directory-details').removeClass('disabled'); // Enables List
  $('.directory-loading .loading-text').text(""); // Resets Loading text
};

DataDirectory.prototype.getEntryField = function( entryIndex, fieldIndex, type ){
  if ( typeof type === 'undefined' ) type = 'entry';

  var output = {};
  var label = this.config.detail_fields[fieldIndex];
  var value = (type == 'search-result-entry') ? this.searchResultData[entryIndex][label] : this.data[entryIndex][label];
  var fieldType = 'text';
  var valueHTML = '';

  if (typeof value === 'undefined') {
    return {
      'label' : label,
      'value' : ''
    }
  }

  if ( this.config.hasOwnProperty('field_types') && this.config.field_types.hasOwnProperty(label) ) {
    fieldType = this.config.field_types[label];
  }

  if ( fieldType === 'text' && this.config.filter_fields.indexOf(label) > -1 ) {
    fieldType = 'filter';
    value = {
      filter : label,
      value : value
    };
  }

  if ( (typeof value === 'object' && value.value.length) || (typeof value === 'string' && value.length) ) {
    var valueTemplate = Handlebars.compile( $('#directory-field-type-' + fieldType + '-template').html() );
    var valueHTML = valueTemplate(value);
  } else {
    var valueHTML = '';
  }

  return {
    'label' : label,
    'value' : valueHTML
  }
};

DataDirectory.prototype.renderLiveSearch = function( value ) {

  this.flViewportRedraw();

  var _this = this;
  if (this.liveSearchTimeout) {
    clearTimeout(this.liveSearchTimeout);
  }
  this.liveSearchTimeout = setTimeout(function(){
    _this.renderSearchResult( {
      type: 'search',
      value: value
    } );
  }, this.liveSearchInterval);

};

DataDirectory.prototype.renderSearchResult = function( options, callback ){

  this.flViewportRedraw();

  // Return all results of search term is empty
  if (!options.value.length) {
    this.switchMode('search');
    return;
  };

  this.switchMode('search-result');
  var data = {
    show_subtitle: this.config.show_subtitle ? this.config.show_subtitle : false,
    show_tags: this.config.show_tags ? this.config.show_tags : false,
    type: options.type,
    result: []
  };

  switch (options.type) {
    case 'filter':
      data.field = options.field;
      data.value = options.value;
      data.result = this.filter( options.field, options.value );
      break;
    case 'filter-value-tag':
      var filterByTag = function(value) {
        var splitTags = value[options.field].split(',');
        for (var i = 0; i < splitTags.length; i++) {
          if (splitTags[i].trim() === options.value.trim()) {
            return true;
          }
        }

        return false;
      };

      data.field = options.field;
      data.value = options.value;
      data.result = this.data.filter(filterByTag);

      // GA Track event
      // window.plugins.ga.trackEvent("directory", "list_tag_filter", options.type + ": " + options.value);

      break;
    case 'search':
    default:
      data.type = 'search';
      data.value = options.value;
      data.result = this.search( options.value );

      // GA Track event
      // window.plugins.ga.trackEvent("directory", "filter", options.type + ": " + options.value);

      break;
  }

  this.searchResultData = data.result;
  var directorySearchResultHTML = Handlebars.templates.directorySearchResult(data);
  $('#search-result').html(directorySearchResultHTML).scrollTop(0);
  if (typeof callback === 'function') setTimeout(callback, 0);
};

DataDirectory.prototype.search = function( value ) {
  var path = ':root > :has(';
  var searchFields = this.config.search_fields;

  for (var i = 0, l = searchFields.length; i < l; i++) {
    if (i > 0) path += ' , ';
    path += '."' + searchFields[i] + '":contains("' + value + '")';
  }
  path += ')';

  return JSONSelect.match( path, this.data );
}

DataDirectory.prototype.filter = function( field, value ) {
  var path = ':root > :has(."' + field + '":val("' + value + '"))';

  return JSONSelect.match( path, this.data );
}

function sortAlphabetically(a,b) {
  // Sort by alphabet
  if (a.toUpperCase() < b.toUpperCase())
    return -1;
  if (a.toUpperCase() > b.toUpperCase())
    return 1;
  return 0;
}

DataDirectory.prototype.getFilterValues = function( field ) {
  var path = '."'+field+'"';
  var values = JSONSelect.match( path, this.data );

  return values.sort(sortAlphabetically).reduce( function(a,b){
    // Remove duplicates
    if (a.indexOf(b) < 0 && b.trim() !== '' ) a.push(b);
    return a;
  }, [] );
};

DataDirectory.prototype.parseQueryVars = function(){
  if ( flQueryVars.hasOwnProperty('action') ) {
    switch ( flQueryVars.action ) {
      case 'search':
        if ( flQueryVars.hasOwnProperty('value') ) {
          this.presetSearch( flQueryVars.value );
        }
        break;
      case 'filter':
        if ( flQueryVars.hasOwnProperty('field') && flQueryVars.hasOwnProperty('value') ) {
          this.presetFilter( flQueryVars.field, flQueryVars.value );
        }
        break;
      case 'open':
        break;
    }
  } else if ( this.deviceIsTablet ) {
    // Open the first entry if on a tablet
    this.openDataEntry(0, 'entry', false);
  }
};

DataDirectory.prototype.presetSearch = function( value ){
  $('#search').val( value );
  this.renderSearchResult( {
    type : 'search',
    value : value
  } );
  if (this.searchResultData.length === 1) {
    this.openDataEntry(0,'search-result-entry');
    if (!this.deviceIsTablet) {
      this.switchMode('default');
    }
  }
  flWebviewRedraw();
};

DataDirectory.prototype.presetFilter = function( field, value ){
  this.renderSearchResult( {
    type : 'filter',
    field : field,
    value : value
  } );
  flWebviewRedraw();
};

DataDirectory.prototype.directoryNotConfigured = function(){
  $('#directory-entries').addClass('not-configured').html('No data is found for the directory');
};

DataDirectory.prototype.flViewportRedraw = function(){
  $('#main-viewport').css('-webkit-transform', 'scale(1)');
  setTimeout(function(){
    $('#main-viewport').css('-webkit-transform', '');
  }, 0);
};

/***************  END: DataDirectory  ***************/
/***************  END: DataDirectory  ***************/
/***************  END: DataDirectory  ***************/
