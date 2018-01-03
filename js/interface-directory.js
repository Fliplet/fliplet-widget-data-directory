/*****************  DataDirectoryForm  *****************/
/*****************  DataDirectoryForm  *****************/
/*****************  DataDirectoryForm  *****************/

var DataDirectoryForm = (function() {
  function updateSelectText($el) {
    var selectedText = $el.find('option:selected').text();
    $el.parents('.select-proxy-display').find('.select-value-proxy').html(selectedText);
  }

  // this reference
  var _this;
  var $dataSources = $('#data-sources');

  // Constructor
  function DataDirectoryForm(configuration) {
    _this = this;

    this.tables = configuration.dataSources;
    this.source = '';

    if (configuration.source) {
      this.source = configuration.source;
    }
    delete configuration.dataSources;

    if (!configuration.thumbShape) {
      $('[name=thumb_shape][value="circular"]').prop('checked', true);
    } else {
      $('[name=thumb_shape][value="' + configuration.thumbShape + '"]').prop('checked', true);
    }

    this.directoryConfig = $.extend(true, {
      is_alphabetical: true,
      alphabetical_field: "",
      label_template: "",
      filter_fields: [],
      search_fields: [],
      detail_fields: [],
      source: '',
      field_types: {},
      folder: {}
    }, configuration);
    if (typeof this.directoryConfig.field_types === 'string' && this.directoryConfig.field_types.length) {
      this.directoryConfig.field_types = JSON.parse(this.directoryConfig.field_types);
    }

    if (typeof this.directoryConfig.enable_thumbs === 'undefined' && this.directoryConfig.thumbnail_field !== '') {
      this.directoryConfig.enable_thumbs = true;
    }

    this.initialiseHandlebars();
    this.parseSelectedTable(this.source);
    this.attachObservers_();
    this.loadDataDirectoryForm();
  }

  DataDirectoryForm.prototype = {
    // Public functions
    constructor: DataDirectoryForm,

    // Public variables
    varName: null,

    initialiseHandlebars: function() {
      Handlebars.registerHelper("select", function(value, options) {
        var $el = $('<select />').html(options.fn(this));
        $el.find('[value="' + value + '"]').attr('selected', true);
        return $el.html();
      });

      Handlebars.registerHelper("filterCheckbox", function(field) {
        var $input = $("<div class='checkbox checkbox-icon'><input data-field='" + field + "' data-type='filter' type='checkbox' id='filter_" + field + "'><label for='filter_" + field + "'><span class='check'><i class='fa fa-check'></i></span></label></div>");

        if (_this.directoryConfig.filter_fields.indexOf(field) > -1) {
          $input.find('input').attr('checked', true);
        }

        return $input[0].outerHTML;
      });

      Handlebars.registerHelper("searchCheckbox", function(field) {
        var $input = $("<div class='checkbox checkbox-icon'><input data-field='" + field + "' data-type='search' type='checkbox' id='search_" + field + "'><label for='search_" + field + "'><span class='check'><i class='fa fa-check'></i></span></label></div>");

        if (_this.directoryConfig.search_fields.indexOf(field) > -1) {
          $input.find('input').attr('checked', true);
        }

        return $input[0].outerHTML;
      });

      Handlebars.registerHelper("typeSelector", function(field) {
        var typeSelectorTemplate = $('#data-type-selector-template').html();
        var fieldType = 'text';
        if (typeof _this.directoryConfig.field_types[field] !== 'undefined') {
          fieldType = _this.directoryConfig.field_types[field];
        }

        var $select = $(typeSelectorTemplate);
        $select.attr('data-field', field);
        $select.attr('data-type', 'type');
        $select.find('[value="' + fieldType + '"]').attr('selected', true);

        return $select[0].outerHTML;
      });
    },

    parseSelectedTable: function(tableID, autoConfigure) {
      if (tableID !== '') {
        for (var i = 0, l = _this.tables.length; i < l; i++) {
          if (_this.tables[i].hasOwnProperty('id') && _this.tables[i].id == tableID) {
            _this.source = _this.tables[i].id;
            _this.columns = _this.tables[i].columns;

            if (!_this.columns || !_this.columns.length) {
              return;
            }

            if (!autoConfigure) {
              return;
            }

            _this.autoConfigureSearch();
            _this.autoConfigureFilter();
            _this.autoConfigureBrowse();
            _this.autoConfigureDetails();
          }
        }
      }
    },

    reloadTables: function() {
      return Fliplet.DataSources.get({
          type: null
        }, {
          cache: false
        });
    },

    loadDataDirectoryForm: function() {
      $('#data-sources').html(Handlebars.templates.dataSourceOptions(_this.tables));
      $('#data-sources').prop('disabled', false);
      $('#data-sources ~ .select-value-proxy').html('&mdash; Select a table &mdash;');

      $('#data-alphabetical-fields').html(Handlebars.templates.dataAlphabeticalField(_this.columns));
      $('#data-tags-fields').html(Handlebars.templates.dataTagsField(_this.columns));
      $('#data-thumbnail-fields').html(Handlebars.templates.dataThumbnailField(_this.columns));

      if (!_this.tables.length) {
        $('#no-data-source-prompt').removeClass('hidden');
      }

      if (_this.source !== '') {
        $dataSources.val(_this.source);
        updateSelectText($dataSources);
        _this.loadConfigurations_();
      }

      if (!_this.columns || !_this.columns.length) {
        $('.options').hide();
        $('#manage-data').addClass('hidden');
        if (_this.source) {
          $('.options-no-columns').show();
        }
        $('.nav-tabs li#main-list-control').addClass('disabled');
        $('.nav-tabs li#details-control').addClass('disabled');
        $('.nav-tabs li#advanced-control').addClass('disabled');
        return;
      }
      $('.options').show();
      $('#manage-data').removeClass('hidden');
      $('.options-no-columns').hide();
      $('.nav-tabs li#main-list-control').removeClass('disabled');
      $('.nav-tabs li#details-control').removeClass('disabled');
      $('.nav-tabs li#advanced-control').removeClass('disabled');
    },

    createDataSource: function() {
      event.preventDefault();
      var name = prompt('Please type a name for your data source:');

      if (!name) {
        return;
      }

      Fliplet.DataSources.create({
        name: name,
        organizationId: Fliplet.Env.get('organizationId')
      }).then(function(ds) {
        _this.tables.push(ds);
        $dataSources.append('<option value="' + ds.id + '">' + ds.name + '</option>');
        $dataSources.val(ds.id).trigger('change');
      });
    },

    manageAppData: function() {
      var dataSourceId = $dataSources.val();
      Fliplet.Studio.emit('overlay', {
        name: 'widget',
        options: {
          size: 'large',
          package: 'com.fliplet.data-sources',
          title: 'Edit Data Sources',
          data: { dataSourceId: dataSourceId }
        }
      });
    },

    autoConfigureSearch: function() {
      _this.directoryConfig.search_fields = (_this.columns && _this.columns.length > 4) ?
        _this.columns.slice(0, 4) :
        _this.columns;
    },

    autoConfigureFilter: function() {
      _this.directoryConfig.filter_fields = (_this.columns && _this.columns.length > 3) ?
        _this.columns.slice(1, 3) :
        _this.columns;
    },

    autoConfigureBrowse: function() {
      if (!_this.columns || !_this.columns.length) {
        return;
      }
      _this.directoryConfig.label_template = "{{" + _this.columns[0] + "}}";
      _this.directoryConfig.alphabetical_field = _this.columns[0];
    },

    autoConfigureDetails: function() {
      _this.directoryConfig.detail_fields = $.extend([], _this.columns);
      if (_this.directoryConfig.detail_fields.length > 1) {
        _this.directoryConfig.detail_fields.shift();
      }
    },

    loadConfigurations_: function() {
      $('#data-sources option[value=""]').remove();
      $('a[href="#data-source"][data-toggle="tab"]').html('Change data source');
      $('.nav.nav-stacked li.disabled').removeClass('disabled');

      $('#data-browse-configurations').html(Handlebars.templates.dataBrowseConfigurations(_this.columns));
      $('#data-browse-configurations select').each(function() {
        updateSelectText($(this));
      });


      $('#directory-browse-label').val(_this.directoryConfig.label_template);

      $('#data-alphabetical-fields-select').val(_this.directoryConfig.alphabetical_field);
      updateSelectText($('#data-alphabetical-fields-select'));

      if (typeof _this.directoryConfig.is_alphabetical === 'string') {
        _this.directoryConfig.is_alphabetical = (_this.directoryConfig.is_alphabetical.toLowerCase().trim() === 'true');
      }
      $('[name=is_alphabetical][value="' + (_this.directoryConfig.is_alphabetical ? 'true' : 'false') + '"]').attr('checked', true);


      $('#data-thumbnail-fields-select').val(_this.directoryConfig.thumbnail_field);
      updateSelectText($('#data-thumbnail-fields-select'));

      $('#data-detail-fields').val(_this.directoryConfig.detail_fields.join(','));

      if (_this.directoryConfig.show_subtitle) {
        $('#show_subtitle').prop('checked', true);
        $('#directory-browse-subtitle').val(_this.directoryConfig.subtitle);
        updateSelectText($('#directory-browse-subtitle'));
        $('.show-subtitle').show();
      }

      if (_this.directoryConfig.show_tags) {
        $('#show_tags').prop('checked', true);
        $('#data-tags-fields-select').val(_this.directoryConfig.tags_field);
        updateSelectText($('#data-tags-fields-select'));
        $('.show-tags').show();
      }

      if (_this.directoryConfig.enable_live_data) {
        $('#enable_live_data').prop('checked', true);
      }

      if (_this.directoryConfig.enable_thumbs) {
        $('#enable-thumb-yes').prop('checked', true).trigger('change');
        $('.thumbs-setting').removeClass('hidden');
      } else {
        $('#enable-thumb-no').prop('checked', true).trigger('change');
      }

      if (_this.directoryConfig.enable_chat) {
        $('#chat-yes').prop('checked', true).trigger('change');;
        $('.chat-screen-selection').removeClass('hidden');
      } else {
        $('#chat-no').prop('checked', true).trigger('change');
      }

      if (_this.directoryConfig.addEntry && _this.directoryConfig.addEntry.enabled) {
        $('[name="directory-control"][value="add-entry"]').prop('checked', true).trigger('change');
      }
      if (_this.directoryConfig.editEntry && _this.directoryConfig.editEntry.enabled) {
        $('[name="directory-control"][value="edit-entry"]').prop('checked', true).trigger('change');
      }
      if (_this.directoryConfig.deleteEntry && _this.directoryConfig.deleteEntry.enabled) {
        $('[name="directory-control"][value="delete-entry"]').prop('checked', true).trigger('change');
      }

    },

    attachObservers_: function() {
      $(document).on("click", "#save-link", _this.saveDataDirectoryForm_);
      $('#data-sources').on('change', $.proxy(_this.dataSourceChanged_, this));
      $('#advanced-tab').on('change', '[name="enable_thumbs"]', _this.showThumbOptions_);
      $('.create-data-source').on('click', _this.createDataSource);
      $('#manage-data').on('click', _this.manageAppData);
      $('.nav.nav-stacked').on('click', 'li.disabled', function() {
        return false;
      });

      $('#show_subtitle').on('change', function() {
        if ($(this).is(":checked")) {
          var tagsField = _this.directoryConfig.tags_field ? _this.directoryConfig.tags_field : _this.columns[0];
          $('#data-tags-fields-select').val(tagsField);
          updateSelectText($('#data-tags-fields-select'));
          $('.show-subtitle').fadeIn();
        } else {
          $('.show-subtitle').hide();
        }
      });

      $('#show_tags').on('change', function() {
        if ($(this).is(":checked")) {
          $('.show-tags').fadeIn();
        } else {
          $('.show-tags').hide();
        }
      });

      $('.tab-content').on('change', '#data-tags-fields-select, #data-alphabetical-fields-select, #data-sources, #data-thumbnail-fields-select, #data-browse-configurations select', function() {
        updateSelectText($(this));
      });

      $('[name="enable_chat"]').on('change', function() {
        var value = $(this).val();

        if (value === "enable-chat") {
          $('.chat-screen-selection').removeClass('hidden');
        } else {
          $('.chat-screen-selection').addClass('hidden');
        }
      });

      $('[name="directory-control"]').on('change', function() {
        var values = [];

        $('[name="directory-control"]:checked').each(function(){
          values.push($(this).val());
        });

        if (values.indexOf('add-entry') !== -1) {
          $('#add-entry-link').parents('.hidden-settings').addClass('active');
        } else {
          $('#add-entry-link').parents('.hidden-settings').removeClass('active');
        }

        if (values.indexOf('edit-entry') !== -1) {
          $('#edit-entry-link').parents('.hidden-settings').addClass('active');
        } else {
          $('#edit-entry-link').parents('.hidden-settings').removeClass('active');
        }
      });

      Fliplet.Studio.onMessage(function(event) {
        if (event.data && event.data.event === 'overlay-close') {
          _this.reloadTables().then(function(dataSources) {
            _this.tables = dataSources;
            _this.dataSourceChanged_(event);
          });
        }
      });
    },

    saveDataDirectoryForm_: function() {
      var data = {
        source: $("#data-sources").val(),
        filter_fields: [],
        search_fields: [],
        data_fields: this.columns,
        field_types: {},
        folder: _this.directoryConfig && _this.directoryConfig.folder ? _this.directoryConfig.folder : {},
        label_template: $('#directory-browse-label').val(),
        show_subtitle: $("#show_subtitle").is(':checked'),
        subtitle: $("#show_subtitle").is(':checked') ? $('#directory-browse-subtitle').val() : '',
        is_alphabetical: ($('[name=is_alphabetical]:checked').val() === "true"),
        alphabetical_field: $('#data-alphabetical-fields-select').val(),
        show_tags: $("#show_tags").is(':checked'),
        tags_field: $("#show_tags").is(':checked') ? $('#data-tags-fields-select').val() : '',
        enable_thumbs: ($('[name=enable_thumbs]:checked').val() === "yes" ? true : false),
        thumbnail_field: $('#data-thumbnail-fields-select').val(),
        show_thumb_list: ($('[name=enable_thumb_list]:checked').val() === "show" ? true : false),
        show_thumb_detail: ($('[name=enable_thumb_details]:checked').val() === "show" ? true : false),
        thumbShape: $('[name=thumb_shape]:checked').val(),
        enable_live_data: ($('#enable_live_data:checked').val() === "on" ? true : false),
        enable_chat: ($('[name=enable_chat]:checked').val() === "enable-chat" ? true : false),
        addEntry: {
          enabled: false,
          dataSourceId: undefined
        },
        editEntry: {
          enabled: false,
          dataSourceId: undefined
        },
        deleteEntry: {
          enabled: false,
          dataSourceId: undefined
        }
      };

      $('[data-type="filter"]:checked').each(function() {
        data.filter_fields.push($(this).data('field'));
      });

      $('[data-type="search"]:checked').each(function() {
        data.search_fields.push($(this).data('field'));
      });

      $('[data-type="type"]').each(function() {
        data.field_types[$(this).data('field')] = $(this).find('select').val();
      });
      data.field_types = JSON.stringify(data.field_types);

      var profileValues = [];

      $('[name="directory-control"]:checked').each(function(){
        profileValues.push($(this).val());
      });

      if (profileValues.indexOf('add-entry') !== -1) {
        data.addEntry.enabled = true;
        data.addEntry.dataSourceId = data.source;
      }
      if (profileValues.indexOf('edit-entry') !== -1) {
        data.editEntry.enabled = true;
        data.editEntry.dataSourceId = data.source;
      }
      if (profileValues.indexOf('delete-entry') !== -1) {
        data.deleteEntry.enabled = true;
        data.deleteEntry.dataSourceId = data.source;
      }

      var detailFields = $('#data-detail-fields').val().trim();
      if (detailFields !== "") {
        detailFields = detailFields.split(",").map(function(field) {
          return field.trim();
        }).filter(function(field) {
          return !(field.trim() === '');

        });
      } else {
        detailFields = [];
      }
      data.detail_fields = detailFields;
      data.rows = [];

      this.directoryConfig = data;
    },

    dataSourceChanged_: function(e) {
      if (e.data && e.data.event === 'overlay-close') {
        _this.parseSelectedTable(e.data.data.dataSourceId, true);
        _this.loadDataDirectoryForm();

        return;
      }

      if (_this.source === "" || confirm("Are you sure you want to change the data source? This will reset your previous configuration for the directory.")) {
        _this.parseSelectedTable($(e.target).val(), true);
        _this.loadDataDirectoryForm();
      } else {
        _this.source;
      }
    },

    showThumbOptions_: function() {
      if ($(this).val() === 'yes') {
        $('.thumbs-setting').removeClass('hidden');
      } else {
        $('.thumbs-setting').addClass('hidden');
      }
    }

  };

  return DataDirectoryForm;
})();

/***************  END: DataSelectForm  ***************/
/***************  END: DataSelectForm  ***************/
/***************  END: DataSelectForm  ***************/