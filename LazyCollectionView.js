var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;

/**
 * @license
 * (c) 2009-2012 Mathieu Breton
 * mbreton{at}xebia{dot}com
 * https://github.com/mbreton/LazyCollectionView
 *
 * Distributed under MIT license.
 * All rights reserved.
 *
 * This graphical component it's strongly inspired by the Plugin JQuery SlickGrid v2.0
 * originaly written by Michael Leibman. It's available here:
 * https://github.com/mleibman/SlickGrid
 *
 * 
 */
Em.LazyCollectionView = Em.CollectionView.extend({

    scrollbarDimensions:null,
    maxSupportedCssHeight:null,

    // TODO : Merge it
 	th:null,   // virtual height
    h:null,    // real scrollable height

    scrollDir:  1,

    // private
    initialized:  false,
    $style:null,
    stylesheet:null,
    viewportH:null,
    viewportW:null,
    canvasWidth:null,
    viewportHasHScroll:null,
    viewportHasVScroll:null,
    numberOfRows:  0,

    rowsCache:  [],
    renderedRows:  {},
    nbRenderedRows:  0,
    numVisibleRows: 0,
    prevScrollTop:  0,
    scrollTop:  0,
    top: 0,
    lastRenderedScrollTop:  0,

    rowHeight:30,
    dataFieldName:"content",
    renderedHook:null,
    deRenderedHook:null,

    /*****************************
     * Initialization ...
     */
    init:function (){
        var ret = this._super();
        this.createCssRules();
        this.maxSupportedCssHeight = this.getMaxSupportedCssHeight();
        this.scrollbarDimensions = this.measureScrollbar();
        $(window).on("scroll", {self: this}, this.handleScroll);
        return ret;
    },

    createCssRules:function() {
        this.$style = $("<style type='text/css' rel='stylesheet' />").appendTo($("head"));
        var rules = [
            ".slick-row { height:" + this.rowHeight + "px; }"
        ];

        if (this.$style[0].styleSheet) { // IE
            this.$style[0].styleSheet.cssText = rules.join(" ");
        } else {
            this.$style[0].appendChild(document.createTextNode(rules.join(" ")));
        }
    },

    getMaxSupportedCssHeight: function() {
        var increment = 1000000;
        var supportedHeight = increment;
        // FF reports the height back but still renders blank after ~6M px
        var testUpTo = ($.browser.mozilla) ? 5000000 : 1000000000;
        var div = $("<div style='display:none' />").appendTo(document.body);

        while (supportedHeight <= testUpTo) {
            div.css("height", supportedHeight + increment);
            if (div.height() !== supportedHeight + increment) {
                break;
            } else {
                supportedHeight += increment;
            }
        }

        div.remove();
        return supportedHeight;
    },

    measureScrollbar: function() {
        var $c = $("<div style='position:absolute; top:-10000px; left:-10000px; width:100px; height:100px; overflow:scroll;'></div>").appendTo("body");
        var dim = {
            width:$c.width() - $c[0].clientWidth,
            height:$c.height() - $c[0].clientHeight
        };
        $c.remove();
        return dim;
    },

	didInsertElement: function() {
        this._super();

        if (!/relative|absolute|fixed/.test(this.$().css("position"))) {
            this.$().css("position", "relative");
        }
        this.updateTop();
        this.viewportW = this.$().css('width');
        this.viewportH = this.getViewportHeight();
        this.initialized = true;
        this._contentDidChange();
    },

    contentLength:function(){
        return this.content ? this.content.length : 0;
    },

    contentAt:function (idx){
        return this.content ? this.content[idx] : null;
    },

    arrayWillChange: function(content, start, removedCount) {
        console.log("-> arrayWillChange (content.length :"+this.contentLength()+", "+start+" , "+removedCount+")");

        var childViews = get(this, 'childViews'), len = get(childViews, 'length');

        /*if (removedCount === this.contentLength()) {
            this.deRenderRows();
        }
        this.updateRowCount();*/
    },

    arrayDidChange: function(content, start, removed, added) {
        console.log("arrayDidChange (content.length :"+this.contentLength()+", "+start+" , "+removed+", "+added+")");
        if (!this.initialized) return;
        var itemViewClass = get(this, 'itemViewClass'),
            childViews = get(this, 'childViews'),
            view, item, idx, len, itemTagName;

        if ('string' === typeof itemViewClass) {
            itemViewClass = Ember.getPath(itemViewClass);
        }

        this.renderRange(true);
        this.updateRowCount();
    },

    getCanvasWidth:function() {
        var availableWidth = this.viewportHasVScroll ? this.viewportW - this.scrollbarDimensions.width : this.viewportW;
        return availableWidth;
    },

    updateCanvasWidth:function() {
        var oldCanvasWidth = this.canvasWidth;
        this.canvasWidth = this.getCanvasWidth();

        if (this.canvasWidth != oldCanvasWidth) {
            this.viewportHasHScroll = (this.canvasWidth > this.viewportW - this.scrollbarDimensions.width);
        }
    },

    scrollTo:function(y) {
        var newScrollTop = y;

        if (this.prevScrollTop != this.newScrollTop) {
            this.scrollDir = (this.prevScrollTop < this.newScrollTop) ? 1 : -1;
            this.lastRenderedScrollTop = this.scrollTop = this.prevScrollTop = this.newScrollTop;
        }
    },

    invalidateAllItemView:function() {
        /*for (var i = 0; i < this.content; i++) {
            if (this.renderedRows[i]) {
                this.renderedRows[i].set(this.dataFieldName, this.content[i]);
            }
        }*/
    },

    updateTop:function(){
        this.top = this.$().offset().top;
    },


    getViewportHeight:function() {
        return $(window).height() - Math.max(0, this.top - this.scrollTop);
    },

    resizeCanvas:function() {
        if (!this.initialized) {
            return;
        }

        this.numVisibleRows = Math.ceil(this.viewportH / this.rowHeight);
        this.viewportW = parseFloat($.css(this.$()[0], "width", true));

        this.updateRowCount();
    },

    updateRowCount:function() {
        this.numberOfRows = this.contentLength();

        var oldViewportHasVScroll = this.viewportHasVScroll;
        // with autoHeight, we do not need to accommodate the vertical scroll bar
        this.viewportHasVScroll = this.numberOfRows * this.rowHeight > this.viewportH;

        var oldH = this.h;
        this.th = this.rowHeight * this.numberOfRows;
        if (this.th < this.maxSupportedCssHeight) {
            // just one page
            this.h = this.th;
        } else {
            Ember.log("SlickGrid does'nt support more than " + maxSupportedCssHeight + " of height");
        }

        if (this.h !== this.oldH) {
            this.$().css("height", this.h);
            this.scrollTop = $(window).scrollTop() - this.$().offset().top;
            this.scrollTop = (this.scrollTop < 0) ? 0 : this.scrollTop;
        }

        var oldScrollTopInRange = (this.scrollTop <= this.th - this.viewportH);

        if (this.th == 0 || this.scrollTop == 0) {
        } else if (this.oldScrollTopInRange) {
            // maintain virtual position
            this.scrollTo(this.scrollTop);
        } else {
            // scroll to bottom
            this.scrollTo(this.th - this.viewportH);
        }
        this.updateCanvasWidth();
    },

    getRenderedRange:function(viewportTop) {
        var range = this.getVisibleRange(viewportTop);
        var buffer = Math.round(this.viewportH / this.rowHeight);
        var minBuffer = 3;

        if (this.scrollDir == -1) {
            range.top -= buffer;
            range.bottom + buffer;
        } else if (this.scrollDir == 1) {
            range.top -= buffer;
            range.bottom += buffer;
        } else {
            range.top -= minBuffer;
            range.bottom += minBuffer;
        }
        range.top = Math.max(0, range.top );
        range.bottom = Math.min(this.contentLength(), range.bottom);

        return range;
    },

    getVisibleRange:function(viewportTop) {
        if (viewportTop == null) {
            viewportTop = this.scrollTop;
        }

        return {
            top:Math.floor((viewportTop) / this.rowHeight),
            bottom:Math.ceil((viewportTop + this.viewportH) / this.rowHeight)
        };
    },

    handleScroll:function(event) {
        var self = this.isView ? this : event.data.self;
        self.scrollTop = $(window).scrollTop();
        self.viewportH = self.getViewportHeight();

        var scrollDist = Math.abs(self.scrollTop - self.prevScrollTop);

        if (scrollDist) {
            self.set('scrollDir', self.prevScrollTop < self.scrollTop ? 1 : -1);
            self.set('prevScrollTop', self.scrollTop);
            if (self.scrollDist < this.viewportH) {
                self.scrollTo(this.scrollTop);
            }

            if (Math.abs(self.lastRenderedScrollTop - self.scrollTop) < self.viewportH) {
                if (Math.abs(self.lastRenderedScrollTop - self.scrollTop) > 20) {
                    self.renderRange();
                }
            } else {
                self.renderRange();
            }
        }
    },

    renderRange:function(withOutBuffer) {
        if (!this.initialized) {
            return;
        }
        var renderedRange = this.getRenderedRange();

        // remove unused rows
        this.deRenderRows(withOutBuffer ? null : renderedRange);

        // add new rows
        this.renderRows(renderedRange);

        this.lastRenderedScrollTop = this.scrollTop;
    },

    renderRows:function(range) {
        for (var i = range.top; i <= range.bottom; i++) {
            if (this.renderedRows[i]) {
                this.renderedRows[i].set(this.dataFieldName, this.contentAt(i));
            } else{
                this.renderedRows[i] = this.renderRow(i);
            }
        }
    },

    renderRow:function(rowNum) {
        var dataItem = this.contentAt(rowNum);

        if (dataItem) {
            var properties={};
            properties[this.dataFieldName] = dataItem;
            properties['top'] = (rowNum * this.rowHeight) + "px";
            var rowView = this.rowsCache.pop();

            if (!rowView){
                rowView = this.createChildView(this.itemViewClass, properties);
                this.get('childViews').pushObject (rowView);
            } else{
                rowView.setProperties(properties);
            }

            if (this.renderedHook){
                Em.run.later(rowView, this.renderedHook, 50);
            }
            return rowView;
        }
        return null;
    },

    deRenderRows:function(rangeToKeep) {
        if (rangeToKeep) console.log('deRender top:'+rangeToKeep.top+ " bottom:"+rangeToKeep.bottom);
        for (var i in this.content) {
            if (Em.none(rangeToKeep) || i < rangeToKeep.top || i > rangeToKeep.bottom) {
                this.deRenderRow(i);
            }
        }
    },

    deRenderRow:function(rowIdx) {
        var rowView = this.renderedRows[rowIdx];
        if (!rowView) { return; }

        this.rowsCache.push(rowView);
        delete this.renderedRows[rowIdx];
        if (this.deRenderedHook){
            Em.run.later(rowView, this.deRenderedHook, 50);
        }
    },

    destroy:function() {
        this._super();
        this.cleanCache();
        $(window).off("scroll", this.handleScroll);
        this.$style.remove();
        this.stylesheet = null;
        this.$style = null;
    },

    cleanCache:function (){
        var self = this, childViews = get(this, 'childViews');
        this.rowsCache.forEach(function (row, idx) {
            row.destroy();
            childViews.removeObject(row);
            delete self.rowsCache[idx];
        });
    }
});