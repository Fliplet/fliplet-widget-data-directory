!function(){var e=Handlebars.template,a=Handlebars.templates=Handlebars.templates||{};a.dataAlphabeticalField=e({1:function(e,a,n,t,l){var o=e.lambda,r=e.escapeExpression;return'        <option value="'+r(o(a,a))+'">'+r(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,t,l){var o;return'<select class="hidden-select form-control" name="alphabetical_field" id="data-alphabetical-fields-select">\n'+(null!=(o=n.each.call(null!=a?a:e.nullContext||{},a,{name:"each",hash:{},fn:e.program(1,l,0),inverse:e.noop,data:l}))?o:"")+"</select>"},useData:!0}),a.dataBrowseConfigurations=e({1:function(e,a,n,t,l){var o,r=null!=a?a:e.nullContext||{},s=n.helperMissing;return"    <tr>\n        <td>"+e.escapeExpression(e.lambda(a,a))+"</td>\n        <td>"+(null!=(o=(n.filterCheckbox||a&&a.filterCheckbox||s).call(r,a,{name:"filterCheckbox",hash:{},data:l}))?o:"")+"</td>\n        <td>"+(null!=(o=(n.searchCheckbox||a&&a.searchCheckbox||s).call(r,a,{name:"searchCheckbox",hash:{},data:l}))?o:"")+"</td>\n        <td>"+(null!=(o=(n.typeSelector||a&&a.typeSelector||s).call(r,a,{name:"typeSelector",hash:{},data:l}))?o:"")+"</td>\n    </tr>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,t,l){var o;return'<table class="table table-hover">\n<thead>\n<tr>\n    <th style="width:25%">Field</th>\n    <th class="text-center">Filter</th>\n    <th class="text-center">Search</th>\n    <th style="width:40%">Format</th>\n</tr>\n</thead>\n<tbody>\n'+(null!=(o=n.each.call(null!=a?a:e.nullContext||{},a,{name:"each",hash:{},fn:e.program(1,l,0),inverse:e.noop,data:l}))?o:"")+"</tbody>\n</table>\n"},useData:!0}),a.dataSourceOptions=e({1:function(e,a,n,t,l){var o,r=null!=a?a:e.nullContext||{},s=n.helperMissing,c=e.escapeExpression;return'    <option value="'+c((o=null!=(o=n.id||(null!=a?a.id:a))?o:s,"function"==typeof o?o.call(r,{name:"id",hash:{},data:l}):o))+'">'+c((o=null!=(o=n.name||(null!=a?a.name:a))?o:s,"function"==typeof o?o.call(r,{name:"name",hash:{},data:l}):o))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,t,l){var o;return"<option>&mdash; Select a table &mdash;</option>\n"+(null!=(o=n.each.call(null!=a?a:e.nullContext||{},a,{name:"each",hash:{},fn:e.program(1,l,0),inverse:e.noop,data:l}))?o:"")},useData:!0}),a.dataTagsField=e({1:function(e,a,n,t,l){var o=e.lambda,r=e.escapeExpression;return'        <option value="'+r(o(a,a))+'">'+r(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,t,l){var o;return'<select class="hidden-select form-control" name="tags_field" id="data-tags-fields-select">\n'+(null!=(o=n.each.call(null!=a?a:e.nullContext||{},a,{name:"each",hash:{},fn:e.program(1,l,0),inverse:e.noop,data:l}))?o:"")+"</select>"},useData:!0}),a.dataThumbnailField=e({1:function(e,a,n,t,l){var o=e.lambda,r=e.escapeExpression;return'        <option value="'+r(o(a,a))+'">'+r(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,t,l){var o;return'<select class="hidden-select form-control" name="thumbnail_field" id="data-thumbnail-fields-select">\n    <option value="">Choose a field</option>\n'+(null!=(o=n.each.call(null!=a?a:e.nullContext||{},a,{name:"each",hash:{},fn:e.program(1,l,0),inverse:e.noop,data:l}))?o:"")+"</select>"},useData:!0})}();