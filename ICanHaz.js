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
    // Also grabs non-script elements with an ID and the "tmpl" class, so that 
    // you can have nested templates to make template design easier
    self.grabTemplates = function (context) {  
    	//allow the templates to be grabbed from a specific document or element
    	!context && (context = document);
        $('script[type="text/html"],[id].tmpl', context).each(function (a, b) {
            var script = $((typeof a === 'number') ? b : a), // Zepto doesn't bind this
                text = (''.trim) ? script.html().trim() : $.trim(script.html());
            
            self[script.hasClass('partial') ? 'addPartial' : 'addTemplate'](script.attr('id'), text);
            script.remove();
        });
    };
    
    //accepts a single URL, an array of URLs, or an object map.  Names in map 
    //are not used for anything
    //assumes the HTML loaded will have script tags or "tmpl" classes to parse
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
    	$.each(urls, function() {
    		urlCount++;
    		$.get('ajax/test.html', function(html) {
    			completeCount++;
    			context = $(html);
    			self.grabTemplates(context);
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
