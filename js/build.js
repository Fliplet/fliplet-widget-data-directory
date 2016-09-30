var config = Fliplet.Widget.getData($('[data-directory-id]').data('directory-id'));
if (config.source) {
  new DataDirectory(config);
}

