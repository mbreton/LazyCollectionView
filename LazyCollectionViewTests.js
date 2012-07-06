var set = Ember.set, get = Ember.get, setPath = Ember.setPath;

Em.ENV.RAISE_ON_DEPRECATION = true;
Em.ENV.CP_DEFAULT_CACHEABLE = true;
Em.ENV.VIEW_PRESERVES_CONTEXT = true;

function buildContent (nbElement, start){
	var items = [];

	for (var i = start || 0; i < nbElement ; i++){
		items[i] = Em.Object.create ({
			name : "Item "+i,
			index : i,
			foo : i % 2 == 0
		});
	}
	return items;
}

App = Em.Application.create();
App.ItemView = Em.View.extend({
	templateName:"item-tmpl",
	classNames:['lazy-item'],
	top:null,
	item : null,
	bar : Em.View.extend({
		templateName:"bar-tmpl",
		text : (this.item && this.item.index % 10 == 0) ? 
					"This Item is divisable by 10" : 
					"This Item is not divisable by 10"
	}),
	updateTopCssPosition:function(){
		this.$().css('top', this.top);
	}.observes("top"),

	didInsertElement:function(){
		this.updateTopCssPosition();
	}
});



module("LazyCollectionView Tests", {
		setup: function() {
			console.log('initialisation');
		    $('#qunit-header').hide();
			$('#qunit-banner').hide();
			$('#qunit-testrunner-toolbar').hide();
			$('#qunit-userAgent').hide();
			$('#qunit-tests').hide();
			$('#qunit-testresult').hide();

			Ember.run.begin();
			window.view = Em.LazyCollectionView.create({
				elementId:"LazyCollectionView",
				content : [],
				itemViewClass : App.ItemView,
				rowHeight: 100,
				dataFieldName : 'item'
			});
			/*
			 * To be sure that ember and the componant now 
			 * and don't defer her insertion in the Dom in
			 * the the next runloop
			 */
			window.view.appendTo('#qunit-fixture');
			Ember.tun.end();

			window.$view = $('#LazyCollectionView');
		},
		teardown: function() {
			console.log('fin ...');
			$('#qunit-header').show();
			$('#qunit-banner').show();
			$('#qunit-testrunner-toolbar').show();
			$('#qunit-userAgent').show();
			$('#qunit-tests').show();
			$('#qunit-testresult').show();
			Ember.run(function(){view.destroy();});
		}
	}
);

test("LazyCollectionView is in DOM", function() {
	equal( $view.length, 1, "The LazyCollectionView should be append to DOM");
});

test("Check if when we set a list to component the rows are created", function() {
	Em.run(function(){
		view.set('content', buildContent(200));
	})
	equal(view.content.length, 200, "The content's component is well setted");
	ok(view.get('childViews').length > 3, "The ember rows are added" );
	ok(view.get('childViews').length < 100, "The component have'nt create all row views for each item of the list" );
});