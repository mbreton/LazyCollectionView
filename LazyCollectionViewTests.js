var set = Ember.set, get = Ember.get, setPath = Ember.setPath;

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
	bar : function (){
		return Em.View.extend({
			templateName:"bar-tmpl",
			text : (this.item.index % 10 == 0) ? 
						"This Item is divisable by 10" : 
						"This Item is not divisable by 10"
		});
	}.property('item.i').cacheable(),
	updateTopCssPosition:function(){
		this.$().css('top', this.top);
	}.observes("top"),

	didInsertElement:function(){
		this.updateTopCssPosition();
	}
});

test("a basic test example", function() {
	Em.LazyScrollCollectionView.create({
		content : buildContent(500, 1),
		itemViewClass : App.ItemView,
		rowHeight: 100,
		dataFieldName : 'item'
	}).appendTo('#qunit-fixture');
});