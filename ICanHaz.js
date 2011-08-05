/*!
ICanHaz.js version 0.9 -- by @HenrikJoreteg
More info at: http://icanhazjs.com
*/
(function ($) {
/*!
  ICanHaz.js -- by @HenrikJoreteg
*/
/*global jQuery  */
function ICanHaz() {
    var self = this;
    self.VERSION = "0.9";
    self.templates = {};
    self.partials = {};
    
    // public function for adding templates
    // We're enforcing uniqueness to avoid accidental template overwrites.
    // If you want a different template, it should have a different name.
    self.addTemplate = function (name, templateString) {
        if (self[name]) throw "Invalid name: " + name + ".";
        if (self.templates[name]) throw "Template \"" + name + "\" exists";
        
        self.templates[name] = templateString;
        self[name] = function (data, raw) {
            data = data || {};
            var result = Mustache.to_html(self.templates[name], data, self.partials);
            return raw ? result : $(result);
        };       
    };
    
    // public function for adding partials
    self.addPartial = function (name, templateString) {
        if (self.partials[name]) {
            throw "Partial \"" + name + "\" exists";
        } else {
            self.partials[name] = templateString;
        }
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

    	//add templates to queue and remove nodes from DOM before getting HTML,
    	//to account for nested templates
    	nodes.each(function (a, b) {
            var node = $((typeof a === 'number') ? b : a), // Zepto doesn't bind this
            	name = node.attr('id') || node.attr('name'),
        		src = node.attr('src'),
        		script = (node[0].tagName == "SCRIPT"),
        		partial = node.hasClass('partial'),
        		include = !script && node.hasClass('include'),
        		keep = !include && !script && node.hasClass('keep'),
        		output = partial && !keep && node.hasClass('output');
            
            //the "output" class indicates a partial placeholder should replace the nested template
            output && node.after(document.createTextNode("{{>" + name + "}}"));
            
            queue.push({
            	partial: partial,
            	name: name || src, //if script[src], use src if no id
            	node: src || node, //if script[src], use src of template to get template dynamically
            	include: include,
            	keep: keep
            });
            
            //clean up styles for elements that will be in DOM
            if (include || keep) {
    			node.removeClass("mustache partial output include keep");
    			!node.attr("class") && node.removeAttr("class");
            }
            //remove if "script" tag or not flagged to "keep" the node as a placeholder in the DOM
            if (script || !keep) {
            	node.removeAttr("id").removeAttr("name").remove();
            }
        });

    	//go through nodes in reverse document order, 
    	//hopefully that will make things come out alright when nested
        $.each(queue.reverse(), function(index, item) {
        	if (typeof item.node == "string") {
        		//add template URL to batch
        		batch.push({
        			name: item.name,
        			url: item.node,
        			partial: item.partial
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
			//use base filename for when it's a URL
			item.name = item.name.match(/([^\\\/]+)\.[^\.]+(?:[\?#]|$)/)[1];
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
    			if (count === 0) {
    				self[item.partial ? 'addPartial' : 'addTemplate'](item.name, html);
    			}
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
$(function () {
    ich.grabTemplates();
});
})(window.jQuery || window.Zepto);
