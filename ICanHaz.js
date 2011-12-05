/*!
ICanHaz.js version 0.9 -- by @HenrikJoreteg
More info at: http://icanhazjs.com
*/
(function ($, Mustache) {
  /*!
    ICanHaz.js -- by @HenrikJoreteg
  */
  /*global jQuery  */
  function ICanHaz() {
    var self = this;
    self.VERSION = "0.9";
    self.templates = {};
    self.partials = {};
    
    //helper function to render a template that may have a name 
    //that is not a valid method name. So, instead of calling:
    //  ich["template-name"](data, raw);
    //you would call, which is simply easier to read:
    //  ich.render("template-name", data, raw);
    self.render = function(name, data, raw) {
        return (self[name]) ? self[name].apply(self, [data, raw]) : "";
    }
    
    // public function for adding templates
    // We're enforcing uniqueness to avoid accidental template overwrites.
    // If you want a different template, it should have a different name.
    self.addTemplate = function (name, templateString) {
        if (self.templates[name]) throw "Template \"" + name + "\" exists";
        if (self[name]) throw "Invalid name: " + name + ".";
        
        self.templates[name] = templateString;
        self[name] = function (data, raw) {
            data = data || {};
            var result = Mustache.to_html(self.templates[name], data, self.partials);
            return raw ? result : $(result);
        };       
    };
    
    // public function for adding partials
    self.addPartial = function (name, templateString) {
        if (self.partials[name]) throw "Partial \"" + name + "\" exists";
        
        self.partials[name] = templateString;
    };
    
    // grabs templates from the DOM and caches them.
    // Loop through and add templates.
    // Whitespace at beginning and end of all templates inside <script> tags will 
    // be trimmed. If you want whitespace around a partial, add it in the parent, 
    // not the partial. Or do it explicitly using <br/> or &nbsp;
    // 
    // Also grabs non-script elements with an ID and the "mustache" class, so that 
    // you can have nested templates to make template design easier
    self.grabTemplates = function (context, callback) {  
      if ($.isFunction(context)) {
        callback = context;
        context = null;
      }
      //allow the templates to be grabbed from a specific document or element
      context = context || document;
      
      var nodes = $('script[type="text/html"],.mustache', context),
        queue = [],
        batch = [];
        
      /*
       *********************************************************
       *** partial: grabs "src" content and removes script tag from page
       * 
       * <script src="tmpl_partial.html" class="mustache partial"></script>
       * 
       *********************************************************
       *** partial: grabs "src" content, removes script tag from page, 
       ***          and outputs a mustache partial reference (as instructed by the "swap" CSS class)
       ***          e.g. replaces script tag with: {{>tmpl_partial}}
       * 
       * <script src="tmpl_partial.html" class="mustache partial swap"></script>
       * 
       *********************************************************
       *** nested template: grabs "src" content and outputs it in place of the script tag 
       ***                  (as instructed by the "embed" CSS class)
       * 
       * <script src="tmpl.html" class="mustache embled"></script>
       * 
       *********************************************************
       *** nested template: inline template identified by "mustache" CSS class, 
       ***                  uses inner HTML as template, then removes tag
       * 
       * <div id="inline_template" class="mustache">
       *  <ul>
       *  {{#items}}
       *    <li><a href="{{link}}">{{name}}</a></li>
       *  {{/items}}
       *  </ul>
       * </div>
       * 
       *********************************************************
       *** nested template: inline template identified by "mustache" CSS class (as instructed by the "keep" CSS class), 
       ***                  uses inner HTML as template, but keeps tag in document after removing ICanHaz.js CSS classes
       * 
       * <div id="inline_template" class="mustache keep">
       *  <ul>
       *  {{#items}}
       *    <li><a href="{{link}}">{{name}}</a></li>
       *  {{/items}}
       *  </ul>
       * </div>
       * 
       *********************************************************
       *** nested template: uses HTML including tag as template (as instructed by the "include" CSS class), 
       *                    then removes all HTML and ICanHaz.js classes and ID 
       * 
       * <ul id="inline_template" class="mustache include">
       *  {{#items}}
       *    <li><a href="{{link}}">{{name}}</a></li>
       *  {{/items}}
       * </ul>
       * 
       */
  
      //add templates to queue and remove nodes from DOM before getting HTML,
      //to account for nested templates
      nodes.each(function (a, b) {
            var node = $((typeof a === 'number') ? b : a), // Zepto doesn't bind this
            src = node.attr('src'),
            name = self.formatName(node.attr('id') || node.attr('name') || src), //if script[src], use "src" if no id
            is_script = (node[0].tagName == "SCRIPT"),
            is_partial = node.hasClass('partial'),
            embed = is_script && !is_partial && node.hasClass('embed'),
            include = !is_script && node.hasClass('include'),
            keep = !include && !is_script && node.hasClass('keep'),
            swap = is_partial && !keep && node.hasClass('swap');
            
            //the "swap" class indicates a partial placeholder should replace the nested template
            swap && node.after(document.createTextNode("{{>" + name + "}}"));
            
            queue.push({
              partial: is_partial,
              name: name, 
              node: node, //if script[src], use "src" of template to get template dynamically
              url: src,
              include: include,
              keep: keep,
              embed: embed
            });
            
            //clean up styles for elements that will be in DOM
            if (include || keep || embed) {
              node.removeClass("mustache partial swap include keep embed");
              !node.attr("class") && node.removeAttr("class");
            }
            //remove if "script" tag, or not flagged to "keep" the node as a placeholder in the DOM, 
            //but don't remove if "embed" is specified, which means we replace the script tag with the HTMl contents
            if ((is_script && !embed) || (!is_script && !keep)) {
              node.removeAttr("id").removeAttr("name").remove();
            }
        });
  
      //go through nodes in reverse document order, 
      //hopefully that will make things come out alright when nested
        $.each(queue.reverse(), function(index, item) {
          if (item.url) {
            //add template URL to batch
            batch.push({
              name: item.name,
              url: item.url,
              partial: item.partial,
              node: item.node,
              embed: item.embed
            });
          } else {
            //get inline template HTML, add parent element if need to "include" template container
            var html = $.trim(item.include ? $('<div/>').append(item.node).html() : item.node.html());
            
            self[item.partial ? 'addPartial' : 'addTemplate'](item.name, html);
            
            //if keeping template node, clear out contents
            item.keep && item.node.empty();
          }
        });
        
        //if there are URLs in the map, load templates via ajax
        if (batch.length) {
          self.loadTemplates(batch, callback);
        } else if (callback) {
          //fire callback since nothing was loaded async
          callback();
        }
        //return the number of static templates found
        return nodes.length - batch.length;
    };
    
    //assumes this is a URL, path, or filename to use as a template name
    self.formatName = function(input) {
      if (input) {
        //regex captures are: [path, filename, pathInfo]
        var matches = input.match(/([^\?#\\\/=]+?)[\\\/]*([\?#].*)?$/);
        //remove any trailing file extension
        return matches[1].replace(/\.[^\.]*$/, "")
        //find non-method characters and remove them, 
        //at the same time capitalizing any trailing alpha characters 
        //to create a camel-case name
        .replace(/[^a-zA-Z0-9_]+(.|$)/g, function(match, letter, index, path) {
          //test to see if the char following non-method name chars 
          //is a letter
          if (/[a-z]/i.test(letter)) {
            //if this is the first letter of the name, leave case, 
            //otherwise capitalize
            return (index == 0) ? letter : letter.toUpperCase(); 
          }
          //return an empty string if non-method chars where found 
          //without any trailing letters
          return ""; 
        //lastly, after camel-casing, 
        //remove any leading numbers 
        });//.replace(/^\d+/, "");
      }
      return "";
    }
    
    //accepts an array or single element that is a URL or config object map
    //object maps are in the format { name: "template name", url: "http://...", partial: true }
    //assumes the HTML loaded will have script tags or "mustache" classes to parse
    self.loadTemplates = function(urls, callback) {
      //create array if not already and remap properties
      urls = $.map($.isArray(urls) ? urls : [urls], function(item) {
        if (typeof item == "string") {
          item = {
            //get name from filename base
            name: item,
            url: item,
            partial: false
          };
        }
        //make sure the name is a valid method name
        item.name = self.formatName(item.name);
        return item;
      });
    
      var urlCount = 0,
        completeCount = 0,
        processed = false,
        //compares the number of urls to the number of completions
        //then fires callback to user
        finalize = function() {
          if (processed && urlCount === completeCount) {
            callback && callback();
          }
        };
      //goes through each url, loading html but doesn't account for errors
      $.each(urls, function(index, item) {
        //have to count here because we don't know how many there are yet
        urlCount++;
        $.get(item.url, function(html) {
          completeCount++;
          //need to wrap in DIV so selectors find elements
          context = $('<div/>').html(html);
          var count = self.grabTemplates(context);
          //if (count === 0) {
          //  self[item.partial ? 'addPartial' : 'addTemplate'](item.name, html);
          //} else {
            //TODO: should this automatically add the remaining HTML as a template?
            html = $.trim(context.html());
            if (html) {
              //if flagged to embed, works like a server-side include, 
              //where the placeholder (script tag) is replaced with the HTML 
              //content at runtime after processing nested templates
              if (item.embed) {
                item.node.replaceWith(html);
              } else {
                self[item.partial ? 'addPartial' : 'addTemplate'](item.name, html);
              }
            }
          //}
          finalize();
        });
      });
      processed = true;
      finalize();
    }
    
    // clears all retrieval functions and empties caches
    self.clearAll = function () {
      for (var key in self.templates) {
        delete self[key];
      }
      self.templates = {};
      self.partials = {};
    };
    
    self.refresh = function () {
      self.clearAll();
      self.grabTemplates();
    };
  }
  
  window.ich = new ICanHaz();
  
  // init itself on document ready
  $(function () { ich.grabTemplates(); });
  
})(window.jQuery || window.Zepto, Mustache);
