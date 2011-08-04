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
    var self = this,
    	partialPrefix = 'partial::';
    self.VERSION = "0.9";
    self.templates = {};
    self.partials = {};
    
    // public function for adding templates
    // We're enforcing uniqueness to avoid accidental template overwrites.
    // If you want a different template, it should have a different name.
    self.addTemplate = function (name, templateString) {
        if (self[name]) throw "Invalid name: " + name + ".";
        if (self.templates[name]) throw "Template \" + name + \" exists";
        
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
            throw "Partial \" + name + \" exists";
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
        $('script[type="text/html"]:not([src]),[id].mustache', context).each(function (a, b) {
            var script = $((typeof a === 'number') ? b : a), // Zepto doesn't bind this
            	text = (''.trim) ? script.html().trim() : $.trim(script.html());
            
            self[script.hasClass('partial') ? 'addPartial' : 'addTemplate'](script.attr('id'), text);
            script.remove();
        });
        //if script tags have a "src" attribute, add them to a URL map
        var urls;
        $('script[type="text/html"][src]').each(function (a, b) {
        	var script = $((typeof a === 'number') ? b : a), // Zepto doesn't bind this
        		src = script.src,
        		prefix = script.hasClass('partial') ? partialPrefix : '';
        	urls = urls || {};
        	//create a map where the name is the ID or base filename
        	urls[prefix + (script.id || script.src)] = src;
        });
        //if there are URLs in the map, load templates via ajax
        if (urls) {
        	self.loadTemplates(urls, callback);
        } else {
        	//fire callback since nothing was loaded async
        	callback && callback();
        }
    };
    
    //accepts a single URL, an array of URLs, or an object map.  Names in map 
    //are not used for anything
    //assumes the HTML loaded will have script tags or "mustache" classes to parse
    self.loadTemplates = function(urls, callback) {
    	if (typeof urls === "string") {
    		urls = [urls];
    	}
    	var urlCount = 0,
    		completeCount = 0,
    		processed = false,
    		//compares the number of urls to the number of completions
    		//then fires callback to user
    		finalize = function() {
    			if (proccessed && urlCount === completeCount) {
    				callback && callback();
    			}
    		};
    	//goes through each url, loading html but doesn't account for errors
    	$.each(urls, function(name, url) {
    		urlCount++;
    		$.get(url, function(html) {
    			completeCount++;
    			context = $(html);
    			var count = self.grabTemplates(context);
    			if (count === 0) {
    				if (name === url) {
    					name = url.match(/([^\\\/]+)\.[^\.]+(?:[\?#]|$)/)[1];
    				}
    				if (name.substr(0, partialPrefix.length) == partialPrefix) {
    					self.addPartial(name.substr(partialPrefix.length), html);
    				} else {
        				self.addTemplate(name, html);
    				}
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
