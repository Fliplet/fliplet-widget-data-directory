/*****************  DataDirectoryForm  *****************/
/*****************  DataDirectoryForm  *****************/
/*****************  DataDirectoryForm  *****************/

var DataDirectoryForm = (function() {

  var $imagesContainer = $('.image-library');
  var templates = {
    folder: template('folder'),
    app: template('app'),
    organization: template('organization'),
    noFiles: template('nofiles')
  };

  function addFolder(folder) {
    $imagesContainer.append(templates.folder(folder));
  }

  function addApp(app) {
    $imagesContainer.append(templates.app(app));
  }

  function addOrganization(organization) {
    $imagesContainer.append(templates.organization(organization));
  }

  function noFiles() {
    $imagesContainer.html(templates.noFiles());
  }

  function template(name) {
    return Handlebars.compile($('#template-' + name).html());
  }

  var upTo = [{ back: openRoot, name: 'Root'}];
  var folders,
      apps,
      organizations;

  function getApps() {
    return Fliplet.Apps
      .get()
      .then(function (apps) {
        return apps.filter(function (app) {
          return !app.legacy;
        });
      });
  }

  function openRoot() {
    // Clean library container
    $imagesContainer.html('');

    // Update paths
    updatePaths();

    var organizationId = Fliplet.Env.get('organizationId');
    return Promise.all([
      Fliplet.Organizations.get(),
      getApps()
    ])
      .then(function renderRoot(values) {
        organizations = values[0];
        apps = values[1];

        values[0].forEach(addOrganization);
        values[1].forEach(addApp);
      });
  }

  function openFolder(folderId) {
    Fliplet.Media.Folders.get({ type: 'folders', folderId: folderId })
      .then(renderFolderContent);
  }

  function openApp(appId) {
    Fliplet.Media.Folders.get({ type: 'folders', appId: appId })
      .then(renderFolderContent);
  }

  function openOrganization(organizationId) {
    Fliplet.Media.Folders.get({ type: 'folders', organizationId: organizationId })
      .then(renderFolderContent);
  }

  function renderFolderContent(values) {
    $('.folder-selection span').html('Select an folder below');
    $imagesContainer.html('');

    if (!values.folders.length) {
      return noFiles();
    }

    folders = values.folders;

    // Render folders and files
    _.sortBy(values.folders, ['name']).forEach(addFolder);
  }

  function updatePaths() {
    if (upTo.length === 1) {
      // Hide them
      $('.back-btn').hide();
      $('.breadcrumbs-select').hide();

      return;
    }

    // Show them
    $('.breadcrumbs-select').show();
    $('.back-btn').show();

    // Parent folder
    $('.up-to').html(upTo[upTo.length - 2].name);

    // Current folder
    $('.helper strong').html(upTo[upTo.length - 1].name);
  }

  // init
  openRoot();

  function updateSelectText($el) {
    var selectedText = $el.find('option:selected').text();
    $el.parents('.select-proxy-display').find('.select-value-proxy').html(selectedText);
  }

  // this reference
  var _this;

  // Constructor
  function DataDirectoryForm( configuration ) {
    _this = this;

    this.tables = configuration.dataSources;
    this.source = '';

    if (configuration.source) {
      this.source = configuration.source;
      $('.options').show();
      $('.nav-tabs li.disabled').removeClass('disabled');
    }
    delete configuration.dataSources;

    this.directoryConfig = $.extend( {
      is_alphabetical : true,
      alphabetical_field : "",
      label_template : "",
      filter_fields : [],
      search_fields : [],
      detail_fields : [],
      source: '',
      field_types : {},
      folderConfig : {}
    }, configuration);
    if ( typeof this.directoryConfig.field_types === 'string' && this.directoryConfig.field_types.length ) {
      this.directoryConfig.field_types = JSON.parse(this.directoryConfig.field_types);
    }

    if (typeof configuration.thumbnail_field !== 'undefined' && configuration.thumbnail_field !== '') {
      $('.thumbs-options').addClass('show');
    }

    if (typeof configuration.folderConfig !== 'undefined' && configuration.thumbnail_field.length) {
      if ('organizationId' in configuration.folderConfig) {
        $('.item-holder[data-organization-id="'+configuration.folderConfig.organizationId+'"]').addClass('selected');
      } else if ('appId' in configuration.folderConfig) {
        $('.item-holder[data-app-id="'+configuration.folderConfig.appId+'"]').addClass('selected');
      } else if ('folderId' in configuration.folderConfig) {
        $('.item-holder[data-folder-id="'+configuration.folderConfig.folderId+'"]').addClass('selected');
      }
    }

    this.initialiseHandlebars();
    this.parseSelectedTable(this.source);
    this.loadDataDirectoryForm();
    this.attachObservers_();

    if ( typeof this.columns !== 'undefined' && this.columns.length ) {
      $('a[href="#data-browse"]').tab('show');
    }
  }

  DataDirectoryForm.prototype = {
    // Public functions
    constructor : DataDirectoryForm,

    // Public variables
    varName : null,

    initialiseHandlebars : function(){
      Handlebars.registerHelper("select", function(value, options){
        var $el = $('<select />').html( options.fn(this) );
        $el.find('[value="' + value + '"]').attr('selected', true);
        return $el.html();
      });

      Handlebars.registerHelper("filterCheckbox", function(field){
        var $input = $("<div class='checkbox'><input data-field='"+field+"' data-type='filter' type='checkbox' id='filter_"+field+"'><label for='filter_"+field+"'><span class='check'><i class='fa fa-check'></i></span></label></div>");

        if ( _this.directoryConfig.filter_fields.indexOf(field) > -1 ) {
          $input.find('input').attr('checked',true);
        }

        return $input[0].outerHTML;
      });

      Handlebars.registerHelper("searchCheckbox", function(field){
        var $input = $("<div class='checkbox'><input data-field='"+field+"' data-type='search' type='checkbox' id='search_"+field+"'><label for='search_"+field+"'><span class='check'><i class='fa fa-check'></i></span></label></div>");

        if ( _this.directoryConfig.search_fields.indexOf(field) > -1 ) {
          $input.find('input').attr('checked',true);
        }

        return $input[0].outerHTML;
      });

      Handlebars.registerHelper("typeSelector", function(field){
        var typeSelectorTemplate = $('#data-type-selector-template').html();
        var fieldType = 'text';
        if ( typeof _this.directoryConfig.field_types[field] !== 'undefined' ) {
          fieldType = _this.directoryConfig.field_types[field];
        }

        var $select = $( typeSelectorTemplate );
        $select.attr('data-field', field);
        $select.attr('data-type', 'type');
        $select.find('[value="' + fieldType + '"]').attr('selected', true);

        return $select[0].outerHTML;
      });
    },

    parseSelectedTable : function(tableID, autoConfigure){
      if (tableID !== '') {
        for (var i = 0, l = _this.tables.length; i < l; i++) {
          if ( _this.tables[i].hasOwnProperty('id') && _this.tables[i].id == tableID ) {
            _this.source = _this.tables[i].id;
            _this.columns = _this.tables[i].columns;
            _this.rows = _this.tables[i].rows;

            if (autoConfigure) {
              _this.autoConfigureSearch();
              _this.autoConfigureFilter();
              _this.autoConfigureBrowse();
              _this.autoConfigureDetails();
            }

            return;
          }
        }
      }
    },

    loadDataDirectoryForm : function(){
      $('#data-sources').html(Handlebars.templates.dataSourceOptions(_this.tables));
      $('#data-alphabetical-fields').html(Handlebars.templates.dataAlphabeticalField(_this.columns));
      $('#data-tags-fields').html(Handlebars.templates.dataTagsField(_this.columns));
      $('#data-thumbnail-fields').html(Handlebars.templates.dataThumbnailField(_this.columns));

      if (!_this.tables.length) {
        $('#no-data-source-prompt').removeClass('hidden');
      }

      if (_this.source !== '') {
        $dataSources = $('#data-sources');
        $dataSources.val(_this.source);
        updateSelectText($dataSources);
        _this.loadConfigurations_();
      }

      if ( typeof _this.columns !== "undefined" && _this.columns.constructor.name === "Array" ) {
        $('#sample-label').html( _this.columns.length > 1 ? '{{' + _this.columns[0] + '}}, {{' + _this.columns[1] + '}}' : '{{' + _this.columns[0] + '}}' );
      }
    },

    autoConfigureSearch : function(){
      _this.directoryConfig.search_fields = (_this.columns.length <= 4) ? _this.columns : _this.columns.slice(0,4);
    },

    autoConfigureFilter : function(){
      _this.directoryConfig.filter_fields = (_this.columns.length <= 3) ? _this.columns : _this.columns.slice(1,3);
    },

    autoConfigureBrowse : function(){
      _this.directoryConfig.label_template = "{{" + _this.columns[0] + "}}";
      _this.directoryConfig.alphabetical_field = _this.columns[0];
    },

    autoConfigureDetails : function(){
      _this.directoryConfig.detail_fields = $.extend([],_this.columns);
      if ( _this.directoryConfig.detail_fields.length > 1 ) {
        _this.directoryConfig.detail_fields.shift();
      }
    },

    loadConfigurations_ : function(){
      $('#data-sources option[value=""]').remove();
      $('a[href="#data-source"][data-toggle="tab"]').html('Change data source');
      $('.nav.nav-stacked li.disabled').removeClass('disabled');

      $('#data-browse-configurations').html(Handlebars.templates.dataBrowseConfigurations(_this.columns));
      $('#data-browse-configurations select').each(function() {
        updateSelectText($(this));
      });


      $('#directory-browse-label').val( _this.directoryConfig.label_template );

      $('#data-alphabetical-fields-select').val( _this.directoryConfig.alphabetical_field );
      updateSelectText($('#data-alphabetical-fields-select'));

      if ( typeof _this.directoryConfig.is_alphabetical === 'string' ) {
        _this.directoryConfig.is_alphabetical = ( _this.directoryConfig.is_alphabetical.toLowerCase().trim() === 'true' );
      }
      $('[name=is_alphabetical][value="' + (_this.directoryConfig.is_alphabetical ? 'true' : 'false') + '"]').attr('checked',true);


      $('#data-thumbnail-fields-select').val( _this.directoryConfig.thumbnail_field );
      updateSelectText($('#data-thumbnail-fields-select'));

      $('#data-detail-fields').val(_this.directoryConfig.detail_fields.join(','));

      if (_this.directoryConfig.show_subtitle) {
        $('#show_subtitle').prop('checked', true);
        $('#directory-browse-subtitle').val( _this.directoryConfig.subtitle );
        updateSelectText($('#directory-browse-subtitle'));
        $('.show-subtitle').show();
      }

      if (_this.directoryConfig.show_tags) {
        $('#show_tags').prop('checked', true);
        $('#data-tags-fields-select').val( _this.directoryConfig.tags_field );
        updateSelectText($('#data-tags-fields-select'));
        $('.show-tags').show();
      }

      if (_this.directoryConfig.enable_live_data) {
        $('#enable_live_data').prop('checked', true);
      }


    },

    attachObservers_ : function(){
      $('.image-library')
        .on('dblclick', '[data-folder-id]', function () {
          var $el = $(this);
          var id = $el.data('folder-id');
          var backItem;

          // Store to nav stack
          backItem = _.find(folders, ['id', id]);
          backItem.back = function () {
            openFolder(id);
          };
          upTo.push(backItem);

          // Open
          openFolder(id);

          // Update paths
          updatePaths();
        })
        .on('dblclick', '[data-app-id]', function () {
          var $el = $(this);
          var id = $el.data('app-id');
          var backItem;

          // Store to nav stack
          backItem = _.find(apps, ['id', id]);
          backItem.back = function () {
            openApp(id);
          };
          upTo.push(backItem);

          // Open
          openApp(id);

          // Update paths
          updatePaths();
        })
        .on('dblclick', '[data-organization-id]', function () {
          var $el = $(this);
          var id = $el.data('organization-id');
          var backItem;

          // Store to nav stack
          backItem = _.find(organizations, ['id', id]);
          backItem.back = function () {
            openOrganization(id);
          };
          upTo.push(backItem);

          // Open
          openOrganization(id);

          // Update paths
          updatePaths();

        })
        .on('click', '[data-folder-id]', function () {
          var $el = $(this);
          // Removes any selected folder
          $('.folder').not(this).each(function(){
            $(this).removeClass('selected');
          });

          if ($el.hasClass('selected')) {
            $('.folder-selection span').html('Select a folder below');
            _this.folderConfig = {};
          } else {
            $('.folder-selection span').html('You have selected a folder');
            _this.folderConfig = { folderId: $el.data('folder-id') };
          }

          $el.toggleClass('selected');
        })
        .on('click', '[data-app-id]', function () {
          var $el = $(this);
          // Removes any selected folder
          $('.folder').not(this).each(function(){
            $(this).removeClass('selected');
          });

          if ($el.hasClass('selected')) {
            $('.folder-selection span').html('Select a folder below');
            _this.folderConfig = {};
          } else {
            $('.folder-selection span').html('You have selected a folder');
            _this.folderConfig = { appId: $el.data('app-id') };
          }

          $el.toggleClass('selected');
        })
        .on('click', '[data-organization-id]', function () {
          var $el = $(this);
          // Removes any selected folder
          $('.folder').not(this).each(function(){
            $(this).removeClass('selected');
          });

          if ($el.hasClass('selected')) {
            $('.folder-selection span').html('Select a folder below');
            _this.folderConfig = {};
          } else {
            $('.folder-selection span').html('You have selected a folder');
            _this.folderConfig = { organizationId: $el.data('organization-id') };
          }

          $el.toggleClass('selected');
        });

      $('.back-btn').click(function () {
        if (upTo.length === 1) {
          return;
        }

        upTo.pop();
        upTo[upTo.length-1].back();
        updatePaths();
      });

      $(document).on( "click", "#save-link", _this.saveDataDirectoryForm_ );
      $('#data-sources').on( 'change', $.proxy(_this.dataSourceChanged_,this) );
      $('#data-source-tab').on( 'change', '#data-thumbnail-fields-select', _this.showThumbOptions_);
      $('.nav.nav-stacked').on( 'click', 'li.disabled', function(){
        return false;
      } );

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

      $('.tab-content').on('change', '#data-tags-fields-select, #data-alphabetical-fields-select, #data-sources, #data-thumbnail-fields-select, #data-browse-configurations select', function () {
        updateSelectText($(this));
      });
    },

    saveDataDirectoryForm_ : function(){
      var data = {
        source: $("#data-sources").val(),
        filter_fields: [],
        search_fields: [],
        data_fields: this.columns,
        field_types: {},
        folderConfig : _this.folderConfig,
        label_template: $('#directory-browse-label').val(),
        show_subtitle: $("#show_subtitle").is(':checked'),
        subtitle: $("#show_subtitle").is(':checked') ? $('#directory-browse-subtitle').val() : '',
        is_alphabetical: ( $('[name=is_alphabetical]:checked').val() === "true" ),
        alphabetical_field: $('#data-alphabetical-fields-select').val(),
        show_tags: $("#show_tags").is(':checked'),
        tags_field: $("#show_tags").is(':checked') ? $('#data-tags-fields-select').val() : '',
        thumbnail_field: $('#data-thumbnail-fields-select').val(),
        show_thumb_list: ($('[name=enable_thumb_list]:checked').val() === "show" ? true : false),
        show_thumb_detail: ($('[name=enable_thumb_details]:checked').val() === "show" ? true : false),
        enable_live_data: ($('#enable_live_data:checked').val() === "on" ? true : false)
      };

      $('[data-type="filter"]:checked').each(function(){
        data.filter_fields.push( $(this).data('field') );
      });

      $('[data-type="search"]:checked').each(function(){
        data.search_fields.push( $(this).data('field') );
      });

      $('[data-type="type"]').each(function(){
        data.field_types[$(this).data('field')] = $(this).find('select').val();
      });
      data.field_types = JSON.stringify(data.field_types);

      var detailFields = $('#data-detail-fields').val().trim();
      if (detailFields !== "") {
        detailFields = detailFields.split(",").map(function (field) {
          return field.trim();
        }).filter(function (field) {
          return !(field.trim() === '');

        });
      } else {
        detailFields = [];
      }
      data.detail_fields = detailFields;
      data.rows = this.rows;

      this.directoryConfig = data;
    },

    dataSourceChanged_ : function(e){
      if ( _this.source === "" || confirm("Are you sure you want to change the data source? This will reset your previous configuration for the directory.") ) {
        $('.options').show();
        $('.nav-tabs li.disabled').removeClass('disabled');
        _this.parseSelectedTable( $(e.target).val(), true );
        _this.loadDataDirectoryForm();
        // $('a[href="#data-browse"]').tab('show');
      } else {
        _this.source;
      }
    },

    showThumbOptions_ : function(e){
      if ( $(this).val() !== '' ) {
        $('.thumbs-options').addClass('show');
      } else {
        $('.thumbs-options.show').removeClass('show');
      }
    }

  };

  return DataDirectoryForm;
})();

/***************  END: DataSelectForm  ***************/
/***************  END: DataSelectForm  ***************/
/***************  END: DataSelectForm  ***************/
