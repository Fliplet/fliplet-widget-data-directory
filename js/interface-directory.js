/*****************  DataDirectoryForm  *****************/
/*****************  DataDirectoryForm  *****************/
/*****************  DataDirectoryForm  *****************/

var DataDirectoryForm = (function() {
  // this reference
  var _this;

  // Constructor
  function DataDirectoryForm( configuration ) {
    _this = this;

    this.tables = configuration.dataSources;
    this.source = (configuration.source) ? configuration.source : '';

    delete configuration.dataSources;

    this.directoryConfig = $.extend( {
      is_alphabetical : true,
      alphabetical_field : "",
      label_template : "",
      filter_fields : [],
      search_fields : [],
      detail_fields : [],
      source: '',
      field_types : {}
    }, configuration);
    if ( typeof this.directoryConfig.field_types === 'string' && this.directoryConfig.field_types.length ) {
      this.directoryConfig.field_types = JSON.parse(this.directoryConfig.field_types);
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
        var $input = $("<label class='table-checkbox'><input data-field='"+field+"' data-type='filter' type='checkbox' /></label>");

        if ( _this.directoryConfig.filter_fields.indexOf(field) > -1 ) {
          $input.find('input').attr('checked',true);
        }

        return $input[0].outerHTML;
      });

      Handlebars.registerHelper("searchCheckbox", function(field){
        var $input = $("<label class='table-checkbox'><input data-field='"+field+"' data-type='search' type='checkbox' /></label>");

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
      $('#data-alphabetical-fields').html(Handlebars.templates.dataSourceOptions(_this.columns));
      $('#data-tags-fields').html(Handlebars.templates.dataTagsField(_this.columns));
      $('#data-thumbnail-fields').html(Handlebars.templates.dataThumbnailField(_this.columns));

      if (!_this.tables.length) {
        $('#no-data-source-prompt').removeClass('hidden');
      }

      if (_this.source !== '') {
        $('#data-sources').val(_this.source);
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

      $('#directory-browse-label').val( _this.directoryConfig.label_template );

      $('#data-alphabetical-fields-select').val( _this.directoryConfig.alphabetical_field );

      if ( typeof _this.directoryConfig.is_alphabetical === 'string' ) {
        _this.directoryConfig.is_alphabetical = ( _this.directoryConfig.is_alphabetical.toLowerCase().trim() === 'true' );
      }
      $('[name=is_alphabetical][value="' + (_this.directoryConfig.is_alphabetical ? 'true' : 'false') + '"]').attr('checked',true);

      var detailFields = "";
      if ( _this.directoryConfig.detail_fields.constructor.name === "Array" ) {
        detailFields = JSON.stringify(_this.directoryConfig.detail_fields);
        detailFields = detailFields.substring(1, detailFields.length-1);
      }

      $('#data-thumbnail-fields-select').val( _this.directoryConfig.thumbnail_field );

      $('#data-detail-fields').val(detailFields);

      if (_this.directoryConfig.show_subtitle) {
        $('#show_subtitle').prop('checked', true);
        $('#directory-browse-subtitle').val( _this.directoryConfig.subtitle );
        $('.show-subtitle').show();
      }

      if (_this.directoryConfig.show_tags) {
        $('#show_tags').prop('checked', true);
        $('#data-tags-fields-select').val( _this.directoryConfig.tags_field );
        $('.show-tags').show();
      }
    },

    attachObservers_ : function(){
      $(document).on( "click", "#save-link", _this.saveDataDirectoryForm_ );

      $('#data-sources').on( 'change', $.proxy(_this.dataSourceChanged_,this) );

      $('.nav.nav-stacked').on( 'click', 'li.disabled', function(){
        return false;
      } );

      $('#show_subtitle').on('change', function() {
        if ($(this).is(":checked")) {
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
    },

    saveDataDirectoryForm_ : function(){
      var data = {
        source: $("#data-sources").val(),
        filter_fields: [],
        search_fields: [],
        field_types: {},
        label_template: $('#directory-browse-label').val(),
        show_subtitle: $("#show_subtitle").is(':checked'),
        subtitle: $("#show_subtitle").is(':checked') ? $('#directory-browse-subtitle').val() : '',
        is_alphabetical: ( $('[name=is_alphabetical]:checked').val() === "true" ),
        alphabetical_field: $('#data-alphabetical-fields-select').val(),
        show_tags: $("#show_tags").is(':checked'),
        tags_field: $("#show_tags").is(':checked') ? $('#data-tags-fields-select').val() : '',
        thumbnail_field: $('#data-thumbnail-fields-select').val()
      };

      $('[data-type="filter"]:checked').each(function(){
        data.filter_fields.push( $(this).data('field') );
      });

      $('[data-type="search"]:checked').each(function(){
        data.search_fields.push( $(this).data('field') );
      });

      $('[data-type="type"]').each(function(){
        data.field_types[$(this).data('field')] = $(this).val();
      });
      data.field_types = JSON.stringify(data.field_types);

      var detailFields = $('#data-detail-fields').val().trim();
      if (detailFields !== "") {
        detailFields = detailFields.split(",");
        for (var i = 0, l = detailFields.length; i < l; i++) {
          detailFields[i] = detailFields[i].substring(1, detailFields[i].length-1);
        }
      } else {
        detailFields = [];
      }
      data.detail_fields = detailFields;

      this.directoryConfig = data;
    },

    dataSourceChanged_ : function(e){
      if ( _this.source === "" || confirm("Are you sure you want to change the data source? This will reset your previous configuration for the directory.") ) {
        var selectedText = $(e.target).find('option:selected').text();
        $(e.target).parents('.select-proxy-display').find('.select-value-proxy').html(selectedText);

        _this.parseSelectedTable( $(e.target).val(), true );
        _this.loadDataDirectoryForm();
        // $('a[href="#data-browse"]').tab('show');
      } else {
        _this.source
      }
    }

  };

  return DataDirectoryForm;
})();

/***************  END: DataSelectForm  ***************/
/***************  END: DataSelectForm  ***************/
/***************  END: DataSelectForm  ***************/
