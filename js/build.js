var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var id = $(this).data('directory-id');
  var config = Fliplet.Widget.getData(id);
  if (config.source) {
    dataDirectory[id] = new DataDirectory(config, this);
  }
});
