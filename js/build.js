var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var container = this;
  var id = $(this).data('directory-id');
  var uuid = $(this).data('directory-uuid');
  var config = Fliplet.Widget.getData(id);
  var connection;
  
  function formatRows(rows) {
    return rows.map(function (row) {
      row.data.dataSourceEntryId = row.id;
      return row.data;
    });
  }

  if (config.source) {
    // Load local data
    Fliplet.DataSources.connect(config.source)
      .then(function (source) {
        connection = source;
        return source.find();
      })
      .then(function (rows) {
        config.rows = formatRows(rows);

        // Start data directory
        dataDirectory[id] = new DataDirectory(config, container);

        // Check if live data is enabled  
        if (config.enable_live_data) {
          // Pull latest data
          connection.pull()
            .then(function (result) {
              if (!result.pull) {
                return;
              }

              config.rows = formatRows(result.entries);
              dataDirectory[id].init();
            })
        }
      });
  }
});
