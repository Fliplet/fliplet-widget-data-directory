/*****************  DataDirectory  *****************/
/*****************  DataDirectory  *****************/
/*****************  DataDirectory  *****************/

var messageTimeout,
  loadingTimeout,
  messageDelay = 5000, // "Loading..." text delay to display
  loadingOverlayDelay = 1000, // Time it takes to display the loading overlay after a click
  date_filter; // Filter used before pick date range when filtering by a date type field

function html_entity_decode(html) {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

var DataDirectory = function(config, container) {
  var _this = this;

  this.config = $.extend({
    is_alphabetical: false,
    alphabetical_field: "",
    label_template: "",
    data_fields: [],
    filter_fields: [],
    search_fields: [],
    field_types: "", // Formatted as a JSON string to avoid invalid key characters (e.g. "?'#") violating CodeIgniter security
    tags_field: "",
    thumbnail_field: "",
    search_only: false,
    mobile_mode: false,
    directory_enabled: true,
    searchResultTemplate: "",
    directoryListTemplate: "",
    directoryDetailsTemplate: ""
  }, config);
  this.data = config.rows;
  delete this.config.rows;

  this.config.is_alphabetical = this.config.is_alphabetical && this.config.alphabetical_field !== ''; // Ensures an alphabetical field is provided
  this.config.enable_thumbs = this.config.enable_thumbs || ( typeof this.config.enable_thumbs === 'undefined' && typeof this.config.thumbnail_field !== 'undefined' && this.config.thumbnail_field.trim() !== '');
  this.$container = $(container).parents('body');
  this.deviceIsTablet = (window.innerWidth >= 640 && window.innerHeight >= 640);
  this.navHeight = $('.fl-viewport-header').height() || 0;
  this.searchBarHeight = this.$container.find('.directory-search').outerHeight();
  this.directoryMode = this.$container.find('.container-fluid').attr('data-mode');
  this.filterOverlay = null;
  this.entryOverlay = null;
  this.searchResultData = [];
  this.supportLiveSearch = true || this.data.length <= 500;
  this.liveSearchInterval = 500;
  this.currentEntry;

  this.checkMobileMode();

  var folderID = this.config.folder && this.config.folder.selectFiles ? this.config.folder.selectFiles[0].id : undefined;

  function initialize() {
    _this.initialiseHandlebars();
    _this.init();
    _this.attachObservers();
  }

  Fliplet.Media.Folders.get({ folderId: folderID }).then(function(response) {
    response.files.forEach(renderThumb);
    initialize();
  }, function onMediaFolderError(err) {
    console.error(err);
    initialize();
  });

  function renderThumb(file) {
    if (_this.data) {
      // Returns placeholder if no match
      _this.data.forEach(function(entry) {
        if (file.name.indexOf(entry[_this.config.thumbnail_field]) !== -1 && entry[_this.config.thumbnail_field].trim() !== '') {
          entry[_this.config.thumbnail_field] = file.url;
        }
      });
    }
  }

  if (typeof this.config.is_alphabetical === 'string') {
    this.config.is_alphabetical = this.config.is_alphabetical.toLowerCase().trim() === 'true';
  }

  if (typeof this.config.field_types === 'string' && this.config.field_types.length) {
    this.config.field_types = JSON.parse(this.config.field_types);
  }

  return this;
};

DataDirectory.prototype.trigger = function(event, detail) {
  var detail = $.extend({
    context: this
  }, detail || {});
  try {
    var customEvent = new CustomEvent(
      event, {
        bubbles: true,
        cancelable: true,
        detail: detail
      }
    );
    document.dispatchEvent(customEvent);
  } catch (e) {
    var evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(event, true, true, detail);
    document.dispatchEvent(evt);
  }
};

DataDirectory.prototype.get = function(key) {
  if (key.length && this.hasOwnProperty(key)) {
    return this[key];
  }
};

DataDirectory.prototype.set = function(key, value) {
  if (key.length) {
    this[key] = value;
  }
};

DataDirectory.prototype.getConfig = function(key) {
  if (key.length && this.config.hasOwnProperty(key)) {
    return this.config[key];
  }
};

DataDirectory.prototype.setConfig = function(key, value) {
  if (key.length) {
    this.config[key] = value;
  }
};

DataDirectory.prototype.refreshDirectory = function() {
  this.checkMobileMode();
  this.entryOverlay.close();

  if (!this.config) {
    return this.directoryNotConfigured();
  }

  this.init();
  this.parseQueryVars();
}

DataDirectory.prototype.initialiseHandlebars = function() {
  var _this = this;

  var lastAlphabetIndex = '';

  Handlebars.registerHelper('plaintext', function(partial, context) {
    // Create compiler function for said partial
    var output = Handlebars.compile(Handlebars.partials[partial]);

    // Return compiled output using said context
    var result = output(context);
    result = $('<div></div>').html(result).text();
    return $('<div></div>').html(result).text();
  });

  Handlebars.registerHelper('moment', function(key, format, obj) {
    return moment(obj[key]).format(format);
  });

  Handlebars.registerHelper('alphabet_divider', function() {
    if (!_this.config.is_alphabetical) return '';

    var entryTitleTemplate = Handlebars.compile("{{[" + _this.config.alphabetical_field + "]}}");
    if (!entryTitleTemplate(this).length) {
      return '';
    }
    var firstCharacterOfTitle = entryTitleTemplate(this)[0].toString().toUpperCase();
    if ("1234567890".indexOf(firstCharacterOfTitle) > -1) firstCharacterOfTitle = '#';
    if (firstCharacterOfTitle !== lastAlphabetIndex) {
      lastAlphabetIndex = firstCharacterOfTitle;
      return Handlebars.templates.directoryListDivider(firstCharacterOfTitle);
    }
  });

  Handlebars.registerHelper('search_result_header', function(data) {
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

  Handlebars.registerHelper('search_result_clear', function(data) {
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
    Handlebars.registerHelper('entry_tags', function(entry) {
      var tags = entry[_this.config.tags_field];
      if (!tags) {
        return '';
      }
      var splitTags = tags.split(",");
      return new Handlebars.SafeString(
        splitTags.map(function(tag) {
          tag = tag.trim();
          if (tag !== '') {
            return '<a class="data-linked" data-type="filter-value-tag" data-value="' + tag + '" data-filter="' + _this.config.tags_field + '" href="#">' + tag + '</a> ';
          }

          return '';
        }).join('<span class="tag-seperation">, </span>')
      );
    });
  }

  Handlebars.registerHelper('entry_thumbnail_bg', function(entry) {
    var thumbnail = entry[_this.config.thumbnail_field];

    if ((!thumbnail || !/^(http|https):\/\//.test(thumbnail)) && !Array.isArray(thumbnail)) {
      return '';
    }

    if (/api\.fliplet\.(com|local)/.test(thumbnail)) {
      // attach auth token
      thumbnail += (thumbnail.indexOf('?') === -1 ? '?' : '&') + 'auth_token=' + Fliplet.User.getAuthToken();
    }

    return 'background-image:url('+thumbnail+')';
  });

  Handlebars.registerPartial('directory_filter_values', Handlebars.templates.directoryFilterValue);
};

DataDirectory.prototype.init = function() {
  // Custom event to fire before an entry is rendered in the detailed view.
  this.trigger('flDirectoryBeforeInit');

  // This before check data length because means that we are probably trying to load something with custom code
  if (!this.config.directory_enabled) return;

  if (!this.data || !this.data.length) {
    return this.directoryNotConfigured();
  }

  // Function to run before initialising the directory.
  if (typeof this.config.before_init === 'function') {
    this.data = this.config.before_init(JSON.parse(JSON.stringify(this.data)));
  }

  this.verifyConfig();
  this.renderFilters();
  this.sortEntries();

  if (this.config.search_only) {
    this.activateSearch();
    setTimeout(function() {
      // _this.$container.find('.search').trigger( 'focus' );
    }, 0);
    return;
  }

  this.checkMobileMode();
  this.renderEntries();
  this.parseQueryVars();

  // Custom event to fire after the directory list is rendered.
  this.trigger('flDirectoryListRendered');
};

DataDirectory.prototype.verifyFields = function(fieldConfig) {
  if (!Array.isArray(this.config[fieldConfig])) return;

  var arr = [];
  for (var i = 0, l = this.config[fieldConfig].length; i < l; i++) {
    if (this.config.data_fields.indexOf(this.config[fieldConfig][i]) > -1) {
      arr.push(this.config[fieldConfig][i]);
    }
  }
  this.config[fieldConfig] = arr;
};

DataDirectory.prototype.verifyConfig = function() {
  this.verifyFields('filter_fields');
  this.verifyFields('search_fields');
  this.verifyFields('detail_fields');
};

DataDirectory.prototype.sortEntries = function() {
  var _this = this;
  var listData = [];

  if (!this.config.is_alphabetical) {
    listData = this.data;
  } else {
    listData = this.data.sort(function(a, b) {
      var attr = _this.config.alphabetical_field;
      if (!a[attr] || !b[attr]) {
        return 0;
      }

      if (a[attr].toString().toUpperCase() < b[attr].toString().toUpperCase())
        return -1;
      if (a[attr].toString().toUpperCase() > b[attr].toString().toUpperCase())
        return 1;
      return 0;
    });
    this.$container.find('.directory-entries').addClass('list-index-enabled');
  }
  this.data = listData;
};

DataDirectory.prototype.renderEntries = function() {
  var entriesData = {
    show_subtitle: this.config.show_subtitle ? this.config.show_subtitle : false,
    show_tags: this.config.show_tags ? this.config.show_tags : false,
    has_thumbnail: (typeof this.config.enable_thumbs !== 'undefined' && this.config.enable_thumbs && typeof this.config.thumbnail_field !== 'undefined' && this.config.thumbnail_field.trim() !== '' && this.config.show_thumb_list ? this.config.show_thumb_list : false),
    thumbShape: (typeof this.config.thumbShape !== 'undefined' && this.config.thumbShape !== null && this.config.thumbShape ? this.config.thumbShape : 'circular'),
    entries: this.data,
    addEntry: {
      enabled: typeof this.config.addEntry !== 'undefined' && this.config.addEntry ? this.config.addEntry.enabled : false,
      dataSourceId: typeof this.config.addEntry !== 'undefined' && this.config.addEntry ? this.config.addEntry.dataSourceId : undefined
    }
  };
  var directoryListTemplate = (this.config.directoryListTemplate !== '') ?
    Handlebars.compile(this.config.directoryListTemplate) :
    Handlebars.templates.directoryListEntries;
  var directoryListHTML = directoryListTemplate(entriesData);

  this.$container.find('.directory-entries').html(directoryListHTML);
  this.renderIndexList();
};

DataDirectory.prototype.renderIndexList = function() {
  if (!this.config.is_alphabetical) return;

  var $listIndex = this.$container.find('.directory-entries + .list-index');
  $listIndex.html('');
  this.$container.find('.directory-entries .divider').each(function() {
    var letter = $(this).text();
    $listIndex.append('<span data-letter="' + letter + '">' + letter + '</span>');
  });

  $(document).on('touchstart mousedown', '.list-index span', $.proxy(this.listIndexTouchStart, this))
    .on('touchmove  mousemove', '.list-index span', $.proxy(this.listIndexTouchMove, this))
    .on('touchend   mouseup', '.list-index span', $.proxy(this.listIndexTouchEnd, this));
};

DataDirectory.prototype.scrollToLetter = function(letter) {
  var scrollToEl = $('.divider[data-letter="' + letter + '"]');
  if (!scrollToEl.length) return;
  var scrollTop = scrollToEl.offset().top + this.$container.find('.directory-entries').scrollTop() - this.searchBarHeight - this.navHeight;
  this.$container.find('.directory-entries')[0].scrollTop = scrollTop;
  this.flViewportRedraw();
};

DataDirectory.prototype.listIndexTouchStart = function(e) {
  e.preventDefault();
  this.listIndexIsTouched = true;

  var $target = $(e.target);
  this.scrollToLetter($target.data('letter'));
};

DataDirectory.prototype.listIndexTouchMove = function(e) {
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

DataDirectory.prototype.listIndexTouchEnd = function(e) {
  this.listIndexIsTouched = false;
};

DataDirectory.prototype.renderFilters = function() {

  if (this.config.filter_fields.length) {
    // 1 or more filter fields configured
    var directoryFilterHTML = Handlebars.templates.directoryFilter(this.config.filter_fields);
    this.$container.find('.filter-list').html(directoryFilterHTML);
  } else {
    // No filter field configured
    this.$container.find('.search').attr('placeholder', 'Search');
    this.$container.find('.filters').remove();
  }

};

DataDirectory.prototype.renderFilterValues = function(filter, inOverlay) {
  if (typeof inOverlay == 'undefined') inOverlay = false;

  var _this = this,
    tags_field = this.config.tags_field ? this.config.tags_field : '',
    values = [],
    data;

  // Check if it's the tag filter
  if (tags_field === filter) {
    this.data.forEach(function(record) {
      if (record[tags_field]) {
        var entryTags = record[tags_field].split(',');
        entryTags.forEach(function(tag) {
          tag = tag.trim();
          if (tag !== "" && values.indexOf(tag) === -1) {
            values.push(tag);
          }
        });
      }
    });

    values = _.sortBy(values);
  } else if (this.config.field_types[filter] === 'date') {
    var isMobile = Modernizr.mobile || Modernizr.tablet;
    var start_date;
    var end_date;

    if (isMobile && Modernizr.inputtypes.date) {
      start_date = getFormatedDate($('.start_date').val());
      end_date = getFormatedDate($('.finish_date').val());
    } else {
      start_date = getFormatedDate($('.start_date').datepicker("getDate"));
      end_date = getFormatedDate($('.finish_date').datepicker("getDate"));
    }
    return this.renderSearchResult({
      type: 'filter',
      field: filter,
      value: [start_date, end_date]
    });
  } else {
    values = this.getFilterValues(filter);
  }

  data = {
    filter: filter.trim(),
    values: values,
    dataType: (tags_field === filter) ? 'filter-value-tag' : 'filter-value'
  };

  if (inOverlay) {
    var overlayContent = Handlebars.templates.directoryFilterOverlay(data);
    this.filterOverlay = new Fliplet.Utils.Overlay(overlayContent, {
      title: 'Filter by ' + filter,
      classes: 'overlay-directory',
      showOnInit: true,
      closeText: '<i class="fa fa-chevron-left"></i>',
      entranceAnim: 'slideInRight',
      exitAnim: 'slideOutRight',
      afterClose: function() {
        _this.filterOverlay = null;
      }
    });
  } else {
    var directoryFilterValuesHTML = Handlebars.templates.directoryFilterValue(data);
    this.$container.find('.filter-value-list').html(directoryFilterValuesHTML);
    this.$container.find('.filter-selected').html(filter);
    this.$container.find('.directory-filters')[0].scrollTop = 0;
    this.switchMode('filter-values');
  }
};

function getFormatedDate(date) {
  var nativeDateFormat = /^\d{4}-\d{2}-\d{2}$/;
  var datepickerDateFormat = /^\d{2}\/\d{2}\/\d{2}$/;

  if (nativeDateFormat.test(date))
    return moment(date, 'YYYY-MM-DD');
  else if (datepickerDateFormat.test(date))
    return moment(date, 'MM/DD/YY');

  return moment(date);
}

DataDirectory.prototype.switchMode = function(mode) {
  /*
   * Modes: default, search, search-result, filter-values
   */

  var validModes = ['default', 'search', 'search-result', 'search-result-entry', 'filter-values'];
  mode = mode.trim().toLowerCase();

  if (validModes.indexOf(mode) < 0) {
    mode = 'default';
  }

  this.$container.find('.container-fluid').attr('data-mode', mode);

  if (mode === 'search') {
    this.searchResultData = [];
    if (this.config.filter_fields.length === 1) {
      this.renderFilterValues(this.config.filter_fields[0]);
    }
  }

  this.resizeSearch();
  this.directoryMode = mode;

  this.flViewportRedraw();
};

DataDirectory.prototype.isMode = function(mode) {
  return this.directoryMode === mode;
};

DataDirectory.prototype.attachObservers = function() {
  var _this = this;

  this.$container.on('click', '.data-linked', $.proxy(this.dataLinkClicked, this));
  $(window).on('resize', function() {
    _this.deviceIsTablet = (window.innerWidth >= 640 && window.innerHeight >= 640);
    _this.checkMobileMode();
    _this.resizeSearch();
    _this.navHeight = $('.fl-viewport-header').height() || 0;
    _this.searchBarHeight = _this.$container.find('.directory-search').outerHeight();
  });
  this.$container.find('.directory-search').on('click', function() {
    // Analytics - Track Event
    Fliplet.Analytics.trackEvent({
      category: 'directory',
      action: 'search'
    });

    _this.$container.find('.search').trigger('focus');
  }).on('submit', function(e) {
    e.preventDefault();
    _this.renderSearchResult({
      type: 'search',
      value: _this.$container.find('.search').val()
    });
  });
  this.$container.find('.search').on('focus', $.proxy(this.activateSearch, this));
  if (this.supportLiveSearch) {
    this.$container.find('.search').on('keydown paste change', function(e) {
      _this.renderLiveSearch($(this).val());
    });
  }
  $(this.$container).on('click', '.search-cancel', function() {
    _this.$container.find('.search').val('');
    _this.deactivateSearch();
    return false;
  });
  $(this.$container).on('click', '.search-result-clear', function() {
    _this.$container.find('.search').val('');
    _this.switchMode('search');
    return false;
  });

  $(this.$container).on('touchmove', '.search-result ul, .filters', function() {
    _this.$container.find('.search').trigger('blur');
  });

  $(this.$container).on('click', '.chat-entry', function() {
    var entryID = $(this).data('entry-id');
    if (_this.config.chatLinkAction) {
      _this.config.chatLinkAction.query = "?contactConversation=" + entryID;
      Fliplet.Navigate.to(_this.config.chatLinkAction);
    }
  });

  $(this.$container).on('click', '.add-new-entry', function() {
    if (_this.config.addEntryLinkAction) {
      _this.config.addEntryLinkAction.query = '?mode="add"';
      Fliplet.Navigate.to(_this.config.addEntryLinkAction);
    }
  });

  $(this.$container).on('click', '.edit-entry', function() {
    var entryID = $(this).data('entry-id');
    if (_this.config.addEntryLinkAction) {
      _this.config.editEntryLinkAction.query = "?dataSourceEntryId=" + entryID;
      Fliplet.Navigate.to(_this.config.editEntryLinkAction);
    }
  });

  $(this.$container).on('click', '.delete-entry', function() {
    // @TODO: Confirm first, then delete entry
    //        Refresh to list view
    var entryID = $(this).data('entry-id');
    var confirmDelete = confirm("Are you sure you want to delete this entry?");

    if (confirmDelete == true) {
      Fliplet.DataSources.connect(_this.config.source).then(function (connection) {
        return connection.removeById(entryID);
      }).then(function onRemove() {
        _this.data = _.remove(_this.data, function(entry) {
          return entry.dataSourceEntryId !== parseInt(entryID, 10);
        });
        _this.refreshDirectory();
      });
    }
  });

  document.addEventListener("flDirectoryEntryBeforeRender", function() {
    _this.disableClicks();
    _this.removeLoading();
    loadingTimeout = setTimeout(function() {
      _this.addLoading();
    }, loadingOverlayDelay);
  }, false);

  document.addEventListener("flDirectoryEntryAfterRender", function() {
    _this.removeLoading();
  }, false);

  this.$container.find('.date_cancel, .overlay-date-range .closeButton').on('click', function() {
    $('.overlay-date-range').removeClass('active');
  });
  this.$container.find('.date_go').on('click', function() {
    $('.overlay-date-range').removeClass('active');
    _this.renderFilterValues(date_filter, _this.config.mobile_mode || !_this.deviceIsTablet);
  });
  $(this.$container).on('click', '.external-link', function() {
    var url = $(this).data('external-url');
    Fliplet.Navigate.url(url);
  });
};

DataDirectory.prototype.activateSearch = function() {
  this.$container.find('.search-cancel').css({
    'top': this.config.search_only ? '-9999px' : ''
  });
  this.$container.find('.directory-screen').css({
    'opacity': this.config.search_only ? '0' : '',
    'pointer-events': this.config.search_only ? 'none' : ''
  });

  if (this.isMode('default')) {
    this.$container.find('.filter-selected').html('');
  }
  if (!this.isMode('search') && !this.isMode('filter-values') && !this.isMode('search-result') && !this.isMode('search-result-entry')) {
    this.switchMode('search');
  }

  if (!this.config.search_only) {
    document.body.classList.add('fl-top-menu-hidden');
  }

  this.flViewportRedraw();
};

DataDirectory.prototype.deactivateSearch = function() {
  if (this.config.search_only) {
    return;
  }

  this.$container.find('.search').trigger('blur');
  if (!this.config.mobile_mode && this.deviceIsTablet && this.isMode('search-result-entry')) {
    this.openDataEntry(0, 'entry', false);
  }
  this.switchMode('default');

  document.body.classList.remove('fl-top-menu-hidden');

  this.flViewportRedraw();
};

DataDirectory.prototype.checkMobileMode = function() {
  if (this.config.mobile_mode) {
    this.$container.addClass('directory-mobile-mode');
  } else {
    this.$container.removeClass('directory-mobile-mode');
  }
};

DataDirectory.prototype.resizeSearch = function() {
  var _this = this;
  setTimeout(function() {
    if (_this.config.search_only) {
      return _this.$container.find('.search').css('width', '');
    }

    if (_this.isMode('search') || _this.isMode('filter-values') || _this.isMode('search-result') || _this.isMode('search-result-entry')) {
      _this.$container.find('.search').css('width', _this.$container.find('.directory-search').width() - _this.$container.find('.search-cancel').outerWidth() + 8);
    } else {
      _this.$container.find('.search').css('width', '');
    }
  }, 0);
};

DataDirectory.prototype.filterOverlayIsActive = function() {
  return this.filterOverlay instanceof Fliplet.Utils.Overlay;
};

DataDirectory.prototype.entryOverlayIsActive = function() {
  return this.entryOverlay instanceof Fliplet.Utils.Overlay;
};

DataDirectory.prototype.dataLinkClicked = function(e) {

  this.flViewportRedraw();

  var _this = this;
  var isMobile = Modernizr.mobile || Modernizr.tablet;
  e.preventDefault();

  // Date
  if (_this.config.field_types[e.currentTarget.dataset.filter] === 'date' && e.currentTarget.dataset.type === 'filter') {
    date_filter = e.currentTarget.dataset.filter;
    $('.date-picker').datepicker({
      format: "dd M yyyy",
      maxViewMode: 2,
      autoclose: true,
      todayHighlight: true
    });
    if (isMobile && Modernizr.inputtypes.date && 'ontouchstart' in document.documentElement) {
      $('.date-picker').datepicker('remove')
    }
    $('.overlay-date-range').addClass('active');
    return;
  }

  // Revert format date to YYYY-MM-DD
  if (_this.config.field_types[e.currentTarget.dataset.filter] === 'date' && e.currentTarget.dataset.type === 'filter-value') {
    e.currentTarget.dataset.value = moment(e.currentTarget.dataset.value).format('YYYY-MM-DD');
  }

  switch (e.currentTarget.dataset.type) {
    case 'filter-tag':
    case 'filter':
      var filter = e.currentTarget.dataset.filter;
      this.renderFilterValues(filter, (this.config.mobile_mode || !this.deviceIsTablet));
      break;
    case 'filter-value-tag':
      e.stopPropagation();
    case 'filter-value':
      this.renderSearchResult({
        type: e.currentTarget.dataset.type,
        field: e.currentTarget.dataset.filter,
        value: e.currentTarget.dataset.value
      }, function() {
        if (_this.filterOverlayIsActive()) {
          _this.filterOverlay.close();
        }
        if (_this.entryOverlayIsActive()) {
          _this.entryOverlay.close();
        }
        setTimeout(function() {
          if (_this.searchResultData.length === 1) {
            _this.openDataEntry(0, 'search-result-entry');
          }
        }, 0);
      });
      break;
    case 'entry':
    case 'search-result-entry':
    default:
      this.openDataEntry(e.currentTarget.dataset.index, e.currentTarget.dataset.type);
      break;
  }
};

DataDirectory.prototype.openDataEntry = function(entryIndex, type, trackEvent) {
  var _this = this;

  if (typeof type === 'undefined') type = 'entry';
  if (typeof trackEvent === 'undefined') trackEvent = true;

  var $listEntry = this.$container.find('li[data-type="' + type + '"][data-index=' + entryIndex + ']');
  var $entrytitle = this.$container.find('li[data-type="' + type + '"][data-index=' + entryIndex + '] .list-title');
  var title = $entrytitle.text().trim();
  var dataArr = (type === 'search-result-entry') ? _this.searchResultData : _this.data;
  var detailData = {
    title: title,
    link_to_chat: this.config.enable_chat ? this.config.enable_chat : false,
    editEntry: {
      enabled: typeof this.config.editEntry !== 'undefined' && this.config.editEntry ? this.config.editEntry.enabled : false,
      dataSourceId: typeof this.config.editEntry !== 'undefined' && this.config.editEntry ? this.config.editEntry.dataSourceId : undefined
    },
    deleteEntry: {
      enabled: typeof this.config.deleteEntry !== 'undefined' && this.config.deleteEntry ? this.config.deleteEntry.enabled : false,
      dataSourceId: typeof this.config.deleteEntry !== 'undefined' && this.config.deleteEntry ? this.config.deleteEntry.dataSourceId : undefined
    },
    has_thumbnail: this.config.show_thumb_detail ? this.config.show_thumb_detail : false,
    thumbShape: this.config.thumbShape ? this.config.thumbShape : 'circular',
    fields: [],
    dataSourceEntryId: dataArr[entryIndex]['dataSourceEntryId'] || ''
  };

  if (typeof this.config.thumbnail_field !== 'undefined' && this.config.thumbnail_field.trim() !== '') {
    detailData['has_thumbnail'] = (typeof this.config.enable_thumbs !== 'undefined' && this.config.enable_thumbs && typeof this.config.thumbnail_field !== 'undefined' && this.config.thumbnail_field.trim() !== '' && this.config.show_thumb_detail ? this.config.show_thumb_detail : false);
    detailData['thumbShape'] = (typeof this.config.thumbShape !== 'undefined' && this.config.thumbShape ? this.config.thumbShape : 'circular');
    detailData['thumbnail'] = (type == 'search-result-entry') ? this.searchResultData[entryIndex][this.config.thumbnail_field] : this.data[entryIndex][this.config.thumbnail_field];
  }

  for (var fieldIndex = 0, l = this.config.detail_fields.length; fieldIndex < l; fieldIndex++) {
    var fieldObj = this.getEntryField(entryIndex, fieldIndex, type);
    if (fieldObj.value.length) {
      detailData.fields.push(fieldObj);
    }
  }

  // Set current entry
  _this.currentEntry = {
    row: dataArr[entryIndex],
    detailData: detailData
  };

  var directoryDetailsTemplate = (this.config.directoryDetailsTemplate !== '') ?
    Handlebars.compile(this.config.directoryDetailsTemplate) :
    Handlebars.templates.directoryDetails;
  var detailHTML = directoryDetailsTemplate(detailData);

  if (type === 'search-result-entry') {
    this.switchMode('search-result-entry');
  }

  // Custom event to fire before an entry is rendered in the detailed view.
  this.trigger('flDirectoryEntryBeforeRender', {
    detailData: detailData
  });

  var after_render = function() {
    // Link taps listeners
    $(".directory-detail-value a").not(".data-linked").on("click", function(e) {
      if ($(e.target).attr("href").indexOf("mailto") === 0) {
        // Analytics - Track Event
        Fliplet.Analytics.trackEvent({
          category: 'directory',
          action: 'entry_email',
          title: title
        });

      } else if ($(e.target).attr("href").indexOf("tel") === 0) {
        // Analytics - Track Event
        Fliplet.Analytics.trackEvent({
          category: 'directory',
          action: 'entry_phone',
          title: title
        });
      } else {
        // Analytics - Track Event
        Fliplet.Analytics.trackEvent({
          category: 'directory',
          action: 'entry_email',
          title: title
        });
      }
    });
    $(".directory-detail-value a.data-linked").on("click", function(e) {
      var filterType = (typeof $(e.target).data("type") !== "undefined") ? $(e.target).data("type") : "";
      var filterValue = (typeof $(e.target).data("value") !== "undefined") ? $(e.target).data("value") : "";

      // Analytics - Track Event
      Fliplet.Analytics.trackEvent({
        category: 'directory',
        action: 'entry_email',
        title: filterType + ": " + filterValue
      });
    });

    // Custom event to fire after an entry is rendered in the detailed view.
    _this.trigger('flDirectoryEntryAfterRender', {
      detailData: detailData
    });
  };

  // Function to run before rendering the entry
  if (typeof this.config.before_render_entry === 'function') {
    detailHTML = this.config.before_render_entry(detailData, detailHTML);
  }

  if (!this.config.mobile_mode && this.deviceIsTablet) {
    this.$container.find('.directory-details .directory-details-content').html(html_entity_decode(detailHTML));
    after_render();
    setTimeout(function() {
      _this.$container.find('li[data-type=' + type + '].active').removeClass('active');
      $listEntry.addClass('active');
    }, 0);
  } else {
    this.entryOverlay = new Fliplet.Utils.Overlay(detailHTML, {
      showOnInit: true,
      classes: 'overlay-directory',
      closeText: '<i class="fa fa-chevron-left"></i>',
      entranceAnim: 'slideInRight',
      exitAnim: 'slideOutRight',
      afterOpen: after_render,
      afterClose: function() {
        _this.entryOverlay = null;
        _this.currentEntry = null;
      }
    });
  }

  // Analytics - Track Event
  if (trackEvent) {
    Fliplet.Analytics.trackEvent({
      category: 'directory',
      action: 'entry_open',
      title: title
    });
  }
};

DataDirectory.prototype.disableClicks = function() {
  this.$container.find('.directory-list, .directory-details').addClass('disabled'); // Disables List
};

// Function that will fade in the loading overlay
DataDirectory.prototype.addLoading = function() {
  // The following adds Loading Overlay to a specific area depending on the device width
  if (this.config.mobile_mode || !this.deviceIsTablet) {
    this.$container.find('.directory-list').find('.directory-loading').fadeIn(400);
  } else {
    this.$container.find('.directory-details').find('.directory-loading').fadeIn(400);
  }

  // Delay to display the "Loading..." text
  messageTimeout = setTimeout(function() {
    $('.directory-loading .loading-text').hide().text("Loading...").fadeIn(250);
  }, messageDelay);
};

// Function that will remove the loading overlay and enable clicks
DataDirectory.prototype.removeLoading = function() {
  clearTimeout(loadingTimeout); // Clears delay loading overlay
  clearTimeout(messageTimeout); // Clears delay for text to appear
  // The following removes Loading Overlay from a specific area depending on the device width
  if (this.config.mobile_mode || !this.deviceIsTablet) {
    this.$container.find('.directory-list').find('.directory-loading').fadeOut(400);
  } else {
    this.$container.find('.directory-details').find('.directory-loading').fadeOut(400);
  }

  this.$container.find('.directory-list, .directory-details').removeClass('disabled'); // Enables List
  $('.directory-loading .loading-text').text(""); // Resets Loading text
};

DataDirectory.prototype.getEntryField = function(entryIndex, fieldIndex, type) {
  if (typeof type === 'undefined') type = 'entry';

  var output = {};
  var label = this.config.detail_fields[fieldIndex];
  var value = (type == 'search-result-entry') ? this.searchResultData[entryIndex][label] : this.data[entryIndex][label];
  var fieldType = 'text';
  var valueHTML = '';

  if (typeof value === 'undefined') {
    return {
      'label': label,
      'value': ''
    }
  }

  if (this.config.hasOwnProperty('field_types') && this.config.field_types.hasOwnProperty(label)) {
    fieldType = this.config.field_types[label];
  }

  if (fieldType === 'text' && this.config.filter_fields.indexOf(label) > -1) {
    fieldType = 'filter';
    value = {
      filter: label,
      value: value
    };
  }

  if (fieldType === 'accordion') {
    fieldType = 'accordion';
    value = {
      id: fieldIndex,
      value: value,
      label: label
    };
  }

  var valueHTML;
  if ((typeof value === 'object' && value && value.value && value.value.length) || (typeof value === 'string' && value.length) || (typeof value === 'number')) {
    if (this.config.show_tags && this.config.tags_field === label && fieldType === 'filter') {
      valueHTML = value.value.split(",").map(function(tag) {
        tag = tag.trim();
        if (tag !== '') {
          return '<a class="data-linked" data-type="filter-value-tag" data-value="' + tag + '" data-filter="' + value.filter + '" href="#">' + tag + '</a>';
        }

        return '';
      }).join(', ');
      valueHTML = '<div class="list-tags">' + valueHTML + '</div>';
    } else {
      if (this.config.field_types[label] === 'date') {
        value = moment(value).format("DD MMM YYYY");
      }

      valueHTML = Handlebars.templates['directoryFieldType-' + fieldType](value);
    }
  } else {
    valueHTML = '';
  }

  return {
    'label': label,
    'value': valueHTML
  }
};

DataDirectory.prototype.renderLiveSearch = function(value) {

  this.flViewportRedraw();

  var _this = this;
  if (this.liveSearchTimeout) {
    clearTimeout(this.liveSearchTimeout);
  }
  this.liveSearchTimeout = setTimeout(function() {
    _this.renderSearchResult({
      type: 'search',
      value: value
    });
  }, this.liveSearchInterval);

};

DataDirectory.prototype.renderSearchResult = function(options, callback) {
  options = options || {};

  if (!options.hasOwnProperty('userTriggered')) {
    options.userTriggered = true;
  }

  if (options.userTriggered) this.activateSearch();
  this.flViewportRedraw();

  // Return all results of search term is empty
  if (!options.value.length) {
    this.switchMode('search');
    return;
  };

  this.switchMode('search-result');
  var data = {
    has_thumbnail: this.config.show_thumb_list ? this.config.show_thumb_list : false,
    thumbShape: this.config.thumbShape ? this.config.thumbShape : 'circular',
    show_subtitle: this.config.show_subtitle ? this.config.show_subtitle : false,
    show_tags: this.config.show_tags ? this.config.show_tags : false,
    type: options.type,
    result: []
  };

  switch (options.type) {
    case 'filter':
    case 'filter-value':
      data.type = 'filter';
      data.field = options.field;
      data.value = options.value;
      data.result = this.filter(options.field, options.value);
      if (this.config.field_types[options.field] === 'date') {
        var startDate = options.value[0];
        var endDate = options.value[1];
        data.value = startDate.format("DD MMM ‘YY") + '&mdash;' + endDate.format("DD MMM ‘YY");
      }
      // Analytics - Track Event
      Fliplet.Analytics.trackEvent({
        category: 'directory',
        action: 'filter',
        title: options.type + ": " + options.value
      });
      break;
    case 'filter-value-tag':
      var filterByTag = function(value) {
        if (value[options.field]) {
          var splitTags = value[options.field].split(',');
          for (var i = 0; i < splitTags.length; i++) {
            if (splitTags[i].trim() === options.value.trim()) {
              return true;
            }
          }
        }

        return false;
      };

      data.field = options.field;
      data.value = options.value;
      data.result = this.data.filter(filterByTag);

      // Analytics - Track Event
      Fliplet.Analytics.trackEvent({
        category: 'directory',
        action: 'list_tag_filter',
        title: options.type + ": " + options.value
      });

      break;
    case 'search':
    default:
      data.type = 'search';
      data.value = options.value;
      data.result = this.search(options.value);

      // Analytics - Track Event
      Fliplet.Analytics.trackEvent({
        category: 'directory',
        action: 'search',
        title: options.type + ": " + options.value
      });

      break;
  }

  this.searchResultData = data.result;
  var searchResultTemplate = (this.config.searchResultTemplate !== '') ?
    Handlebars.compile(this.config.searchResultTemplate) : Handlebars.templates.directorySearchResult;
  var directorySearchResultHTML = searchResultTemplate(data);
  this.$container.find('.search-result').html(directorySearchResultHTML).scrollTop(0);
  if (typeof callback === 'function') setTimeout(callback, 0);
};

DataDirectory.prototype.search = function(search) {
  var entries = [];
  var searchFields = this.config.search_fields;
  // Escape search
  var s = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  var term = new RegExp(s, "i");

  this.data.forEach(function(entry) {
    for (var i = 0; i < searchFields.length; i++) {
      var value = entry[searchFields[i]];
      if (!value) {
        continue;
      }

      if (typeof value === 'string' && value.match(term)) {
        return entries.push(entry);
      }

      if (value === search) {
        entries.push(entry);
      }
    }
  });

  return entries;
};

DataDirectory.prototype.filter = function(field, value) {
  if (this.config.field_types[field] === 'date') {
    var startDate = value[0];
    var endDate = value[1];
    var output = _.filter(this.data, function(o) {
      if (!o.hasOwnProperty(field) || !o[field]) {
        return false;
      }
      return moment(o[field]).isBetween(startDate, endDate, 'day', '[]');
    });
    return _.sortBy(output, [function(o) {
      return parseInt(moment(o[field]).format('x'));
    }]);
  }

  return this.data.filter(function(x) {
    return x[field] == value;
  });
}

DataDirectory.prototype.getFilterValues = function(field) {
  var values = [];
  this.data.forEach(function getValues(entry) {
    var entryValue = entry[field];
    if (entryValue && values.indexOf(entryValue) === -1) {
      values.push(entryValue);
    }
  });

  return values.sort();
};

DataDirectory.prototype.parseQueryVars = function() {
  var query = Fliplet.Navigate.query;
  if (query.action) {
    switch (query.action) {
      case 'search':
        if (query.value) {
          this.presetSearch(query.value);
        }
        break;
      case 'filter':
        if (query.field && query.value) {
          this.presetFilter(query.field, query.value);
        } else {
          this.activateSearch();
        }
        break;
      case 'open':
        break;
    }
  } else if (!this.config.mobile_mode && this.deviceIsTablet && !this.config.search_only) {
    // Open the first entry if on a tablet and search_only mode isn't on
    this.openDataEntry(0, 'entry', false);
  }
};

DataDirectory.prototype.presetSearch = function(value) {
  this.$container.find('.search').val(value);
  this.renderSearchResult({
    type: 'search',
    value: value,
    userTriggered: false
  });
  if (this.searchResultData.length === 1 && !this.currentEntry) {
    this.openDataEntry(0, 'search-result-entry');
    if (this.config.mobile_mode || !this.deviceIsTablet) {
      this.switchMode('default');
    }
  }
  this.flViewportRedraw();
};

DataDirectory.prototype.presetFilter = function(field, value) {
  this.renderSearchResult({
    type: 'filter',
    field: field,
    value: value,
    userTriggered: false
  });
  this.flViewportRedraw();
};

DataDirectory.prototype.directoryNotConfigured = function() {
  this.$container.find('.directory-entries').addClass('not-configured').html('No data is found for the directory');
};

DataDirectory.prototype.flViewportRedraw = function() {
  $(document.body).css('-webkit-transform', 'scale(1)');
  setTimeout(function() {
    $(document.body).css('-webkit-transform', '');
  }, 0);
};

/***************  END: DataDirectory  ***************/
/***************  END: DataDirectory  ***************/
/***************  END: DataDirectory  ***************/
