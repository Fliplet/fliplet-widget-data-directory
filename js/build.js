$('[data-directory-id]').each(function(){
  var config = Fliplet.Widget.getData($(this).data('directory-id'));
  if (config.source) {
    new DataDirectory(config, this);
  }
});
