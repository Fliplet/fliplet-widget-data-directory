!function(){var e=Handlebars.template,a=Handlebars.templates=Handlebars.templates||{};a.dataAlphabeticalField=e({1:function(e,a,n,l,t){var o=e.lambda,s=e.escapeExpression;return'        <option value="'+s(o(a,a))+'">'+s(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,l,t){var o;return'<select class="hidden-select form-control" name="alphabetical_field" id="data-alphabetical-fields-select">\n'+(null!=(o=n.each.call(null!=a?a:{},a,{name:"each",hash:{},fn:e.program(1,t,0),inverse:e.noop,data:t}))?o:"")+"</select>"},useData:!0}),a.dataBrowseConfigurations=e({1:function(e,a,n,l,t){var o,s=null!=a?a:{},i=n.helperMissing;return"    <tr>\n        <td>"+e.escapeExpression(e.lambda(a,a))+"</td>\n        <td>"+(null!=(o=(n.filterCheckbox||a&&a.filterCheckbox||i).call(s,a,{name:"filterCheckbox",hash:{},data:t}))?o:"")+"</td>\n        <td>"+(null!=(o=(n.searchCheckbox||a&&a.searchCheckbox||i).call(s,a,{name:"searchCheckbox",hash:{},data:t}))?o:"")+"</td>\n        <td>"+(null!=(o=(n.typeSelector||a&&a.typeSelector||i).call(s,a,{name:"typeSelector",hash:{},data:t}))?o:"")+"</td>\n    </tr>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,l,t){var o;return'<table class="table table-hover">\n<thead>\n<tr>\n    <th>Fields</th>\n    <th class="text-center">Use as filter</th>\n    <th class="text-center">Use for search</th>\n    <th>Display option</th>\n</tr>\n</thead>\n<tbody>\n'+(null!=(o=n.each.call(null!=a?a:{},a,{name:"each",hash:{},fn:e.program(1,t,0),inverse:e.noop,data:t}))?o:"")+"</tbody>\n</table>"},useData:!0}),a.dataPublishedField=e({1:function(e,a,n,l,t){var o=e.lambda,s=e.escapeExpression;return'        <option value="'+s(o(a,a))+'">'+s(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,l,t){var o;return'<select class="hidden-select form-control" name="published_field" id="data-published-fields-select">\n    <option value="">Choose a field (optional)</option>\n'+(null!=(o=n.each.call(null!=a?a:{},a,{name:"each",hash:{},fn:e.program(1,t,0),inverse:e.noop,data:t}))?o:"")+"</select>\n"},useData:!0}),a.dataSourceOptions=e({1:function(e,a,n,l,t){var o,s=null!=a?a:{},i=n.helperMissing,r="function",c=e.escapeExpression;return'    <option value="'+c((o=null!=(o=n.id||(null!=a?a.id:a))?o:i,typeof o===r?o.call(s,{name:"id",hash:{},data:t}):o))+'">'+c((o=null!=(o=n.name||(null!=a?a.name:a))?o:i,typeof o===r?o.call(s,{name:"name",hash:{},data:t}):o))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,l,t){var o;return"<option>&mdash; Select a table &mdash;</option>\n"+(null!=(o=n.each.call(null!=a?a:{},a,{name:"each",hash:{},fn:e.program(1,t,0),inverse:e.noop,data:t}))?o:"")},useData:!0}),a.dataTagsField=e({1:function(e,a,n,l,t){var o=e.lambda,s=e.escapeExpression;return'        <option value="'+s(o(a,a))+'">'+s(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,l,t){var o;return'<select class="hidden-select form-control" name="tags_field" id="data-tags-fields-select">\n'+(null!=(o=n.each.call(null!=a?a:{},a,{name:"each",hash:{},fn:e.program(1,t,0),inverse:e.noop,data:t}))?o:"")+"</select>"},useData:!0}),a.dataThumbnailField=e({1:function(e,a,n,l,t){var o=e.lambda,s=e.escapeExpression;return'        <option value="'+s(o(a,a))+'">'+s(o(a,a))+"</option>\n"},compiler:[7,">= 4.0.0"],main:function(e,a,n,l,t){var o;return'<select class="hidden-select form-control" name="thumbnail_field" id="data-thumbnail-fields-select">\n    <option value="">Choose a field (optional)</option>\n'+(null!=(o=n.each.call(null!=a?a:{},a,{name:"each",hash:{},fn:e.program(1,t,0),inverse:e.noop,data:t}))?o:"")+"</select>"},useData:!0})}();