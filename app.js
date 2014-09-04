var nav = null; // the crumb container
var main = null; // the page container
var root = null; // the list head
var player = null; // the player one
var active = null; // the active one

function onHashChange(e) {
	var split;
	var hash = null;
	var hashIndex = location.href.indexOf('#');
	if (hashIndex == -1 || hashIndex >= location.href.length - 1) split = [];
	else split = location.href.substr(hashIndex + 1).split('/');
	console.log('onHashChange handling', split); // %%%
	for (var i = split.length - 1; i >= 0; i--) {
		hash = {
			datum: decodeURIComponent(split[i]),
			next: hash
		};
	}

	root.handle(hash);
}

function Base(id, here) {
	this.id = id;
	this.here = here;
	this.next = null;
	this.title = null;

	this.crumb = document.createElement('a');
	this.crumb.href = this.here;

	this.page = document.createElement('div');
}

Base.resolveEndpoint = function (endpoint) {
	return 'http://www.apmmusic.com/myapm/' + endpoint;
};

Base.ajax = function (endpoint, type, object, method) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', proxy(Base.resolveEndpoint(endpoint)));
	xhr.responseType = type;
	xhr.addEventListener('load', function (e) {
		object[method].call(object, xhr.response);
	});
	xhr.send(null);
};

Base.prototype.add = function (ref) {
	if (ref) nav.insertBefore(this.crumb, ref);
	else nav.appendChild(this.crumb);
};

Base.prototype.remove = function () {
	nav.removeChild(this.crumb);
};

Base.prototype.setTitle = function (title) {
	this.title = title;
	this.crumb.textContent = this.title;
	if (active === this) document.title = title;
};

Base.prototype.addHeader = function (className) {
	this.page.className = className;
	var h1 = document.createElement('h1');
	h1.textContent = this.title;
	var div = document.createElement('div');
	div.className = 'header';
	div.appendChild(h1);
	this.page.appendChild(div);
};

Base.prototype.addLink = function (href, name) {
	var span = document.createElement('span');
	span.className = 'name';
	span.textContent = name;
	var a = document.createElement('a');
	a.className = 'link';
	a.href = href;
	a.appendChild(span);
	var div = document.createElement('div');
	div.className = 'item';
	div.appendChild(a);
	this.page.appendChild(div);
};

Base.prototype.resolve = function (id) {
	return this.here + '/' + encodeURIComponent(id);
};

Base.prototype.activate = function () {
	this.crumb.className = 'active';
	main.appendChild(this.page);
	document.title = this.title;
};

Base.prototype.deactivate = function () {
	this.crumb.className = '';
	main.removeChild(this.page);
};

Base.prototype.ensureActive = function () {
	if (active === this) return;
	if (active) active.deactivate();
	this.activate();
	active = this;
};

Base.prototype.compare = function (id) {
	return id == this.id;
};

Base.prototype.truncate = function () {
	if (!this.next) return;
	this.next.truncate();
	this.next.remove();
	this.next = null;
};

Base.prototype.create = function (id) {
	throw new Error('not implemented');
};

Base.prototype.open = function (hash) {
	this.next = this.create(hash.datum);
	this.next.add();
};

Base.prototype.navigate = function (hash) {
	if (this.next && !this.next.compare(hash.datum)) this.truncate();
	if (!this.next) this.open(hash);
	this.next.handle(hash.next);
};

Base.prototype.handle = function (hash) {
	if (hash) this.navigate(hash);
	else this.ensureActive();
};

Base.prototype.redirect = function (href) {
	console.log('redirect requested, active=', active, '; this=', this); // %%%
	if (active === this) location.replace(href);
};

function RTMPPlayer() {
	this.id = null;
	this.connected = false;
	this.paused = false;
	this.current = null;

	var param = document.createElement('param');
	param.name = 'allowScriptAccess';
	param.value = 'always';
	this.movie = document.createElement('object');
	this.movie.id = 'movie';
	this.movie.data = RTMPPlayer.MOVIE;
	this.movie.width = 1;
	this.movie.height = 1;
	this.movie.appendChild(param);

	var rtmpPlayer = this;
	// var icon = document.createElement('span');
	// icon.className = 'icon';
	this.pauseButton = document.createElement('a');
	this.pauseButton.className = 'pause';
	// this.pauseButton.appendChild(icon.cloneNode());
	this.pauseButton.textContent = 'PAUSE';
	this.pauseButton.addEventListener('click', function (e) {
		if (!rtmpPlayer.connected || !rtmpPlayer.current) return;
		if (rtmpPlayer.paused) rtmpPlayer.movie.resume();
		else rtmpPlayer.movie.pause();
	});
	this.prevButton = document.createElement('a');
	this.prevButton.className = 'prev';
	// this.prevButton.appendChild(icon.cloneNode());
	this.prevButton.textContent = 'PREV';
	this.nextButton = document.createElement('a');
	this.nextButton.className = 'next';
	// this.nextButton.appendChild(icon.cloneNode());
	this.nextButton.textContent = 'NEXT';
}

RTMPPlayer.AK_PARTS = /^(\w+_(\w+)_[\d~]+)_\d+$/;
RTMPPlayer.MOVIE = RESOURCE_BASE + 'player.swf';

RTMPPlayer.resolveRMTP = function (ak) {
	var match = RTMPPlayer.AK_PARTS.exec(ak);
	return 'mp3:audio/' + match[2] + '/' + match[1] + '/' + match[0];
};

RTMPPlayer.prototype.add = function () {
	document.body.appendChild(this.movie);
};

RTMPPlayer.prototype.addUi = function () {
	var separator = document.createElement('span');
	separator.className = 'separator';
	var div = document.createElement('div');
	div.className = 'player';
	div.appendChild(this.pauseButton);
	div.appendChild(separator);
	div.appendChild(this.prevButton);
	div.appendChild(this.nextButton);
	document.body.appendChild(div);
};

RTMPPlayer.prototype.playCurrent = function () {
	this.movie.play(RTMPPlayer.resolveRMTP(this.current.ak), 0, -1, true);
};

RTMPPlayer.prototype.play = function (node) {
	this.current = node;
	console.log('play() set current', this.current.t); // %%%
	if (this.connected) this.playCurrent();
	if (this.paused) this.movie.resume();
};

RTMPPlayer.prototype.offerLink = function (node) {
	if (!this.current || this.current.ak != node.ak) return;
	this.current = node;
	console.log('offerLink() set current', this.current.t); // %%%
	// %%%%%%% now what?
};

RTMPPlayer.prototype.onLoad = function () {
	this.movie.connect('rtmp://stream.apmmusic.com/myapm_stream_app/');
};

RTMPPlayer.prototype.onStatus = function (info) {
	console.log('RTMPPlayer onStatus', info); // %%%
	switch (info.code) {
	case 'NetConnection.Connect.Success':
		this.connected = true;
		if (this.current) this.playCurrent();
		break;
	case 'NetStream.Pause.Notify':
		this.paused = true;
		this.pauseButton.textContent = 'RESUME';
		break;
	case 'NetStream.Unpause.Notify':
		this.paused = false;
		this.pauseButton.textContent = 'PAUSE';
		break;
	}
};

RTMPPlayer.prototype.onPlayStatus = function (info) {
	console.log('RTMPPlayer.onPlayStatus', info); // %%%
	switch (info.code) {
	case 'NetStream.Play.Complete':
		if (this.current.next) {
			this.current = this.current.next;
			this.playCurrent();
		}
		break;
	}
};

function UniqueTitleSet() {
	this.set = {};
}

UniqueTitleSet.VARIANT = /(?: Vox| Instrumental| Sting| - Sting| Underscore| - ?Remix(?: \d+)?| [A-Z]| [a-z]| \(.+\)| [36]0[a-z]?| OL| (?:Main|Alternate|Instrumental|Percussion|- .+) Mix)*$/;

UniqueTitleSet.prototype.offer = function (title) {
	var base = title.replace(UniqueTitleSet.VARIANT, '');
	if (base in this.set) return true;
	else return this.set[base] = false;
};

function GetTracks(id, here, fields) {
	Base.call(this, id, here);

	this.page.className = 'album loading';
	this.addHeader('h1');
	this.setFields(fields);
	this.cover.src = GetTracks.PLACEHOLDER;

	Base.ajax(BlueAccessSimple.resolveSearch('cdtrackinfo', 'pkcd', this.id), 'document', this, 'onLoad');
}

GetTracks.PLACEHOLDER = 'http://placehold.it/228.png';
GetTracks.CD_ATTRS = ['ak', 'ttracks', 'reldate'];
GetTracks.TR_ATTRS = ['ak', 't', 'd', 'trtime', 'trnum'];

GetTracks.resolveCover = function (ak) {
	return 'http://www.apmmusic.com/images/cd/' + ak + '.jpg';
};

GetTracks.resolveDownload = function (ak) {
	var match = RTMPPlayer.AK_PARTS.exec(ak);
	return 'http://www.apmmusic.com/audio/' + match[2] + '/' + match[1] + '/' + match[0] + '.mp3';
};

GetTracks.prototype = Object.create(Base.prototype);
GetTracks.prototype.constructor = GetTracks;

GetTracks.prototype.addHeader = function (heading) {
	this.heading = document.createElement(heading);
	this.cover = document.createElement('img');
	this.desc = document.createElement('pre');
	this.catcode = document.createElement('span');
	this.catcode.className = 'detail catcode';
	this.ttracks = document.createElement('span');
	this.ttracks.className = 'detail ttracks';
	this.reldate = document.createElement('span');
	this.reldate.className = 'detail reldate';
	var div = document.createElement('div');
	div.className = 'header';
	div.appendChild(this.heading);
	div.appendChild(this.cover);
	div.appendChild(this.desc);
	div.appendChild(this.catcode);
	div.appendChild(this.ttracks);
	div.appendChild(this.reldate);
	this.page.appendChild(div);
};

GetTracks.prototype.setTitle = function (title) {
	Base.prototype.setTitle.call(this, title);
	this.heading.textContent = title;
};

GetTracks.prototype.setFields = function (fields) {
	if (fields) {
		this.setTitle(fields.title);
		this.desc.textContent = fields.desc;
		this.catcode.textContent = fields.code;
	} else {
		this.setTitle('(' + this.id + ')');
	}
};

GetTracks.prototype.addLink = function (tr, alt, prev) {
	var span1 = document.createElement('span');
	span1.className = 'left trnum';
	span1.textContent = tr.trnum;
	var a1 = document.createElement('a');
	a1.className = 'name';
	a1.href = this.resolve(tr.ak);
	a1.textContent = tr.t;
	var span2 = document.createElement('span');
	span2.className = 'trtime';
	span2.textContent = tr.trtime;
	var a2 = document.createElement('a');
	a2.className = 'download';
	a2.href = GetTracks.resolveDownload(tr.ak);
	var pre = document.createElement('pre');
	pre.textContent = tr.d;
	var div = document.createElement('div');
	div.id = tr.ak;
	div.className = alt ? 'item alt' : 'item';
	div.appendChild(span1);
	div.appendChild(a1);
	div.appendChild(span2);
	div.appendChild(a2);
	div.appendChild(pre);
	this.page.appendChild(div);

	var node = {ak: tr.ak, t: tr.t, prev: alt ? null : prev, next: null};
	player.offerLink(node);
	a1.addEventListener('click', function (e) {
		player.play(node);
		e.preventDefault();
	});
	if (prev && !alt) prev.next = node;
	return alt ? prev : node;
};

GetTracks.prototype.onLoad = function (doc) {
	var cd = BlueAccessSimple.getAttrs(doc.getElementsByTagName('cd')[0], GetTracks.CD_ATTRS);
	this.cover.src = GetTracks.resolveCover(cd.ak);
	this.ttracks.textContent = cd.ttracks;
	this.reldate.textContent = cd.reldate;

	var prev = null;
	var titles = new UniqueTitleSet();
	var tracks = XMLTree.getElementChildren(doc.getElementsByTagName('tracks')[0]);
	for (var i = 0; i < tracks.length; i++) {
		var tr = BlueAccessSimple.getAttrs(tracks[i], GetTracks.TR_ATTRS);
		prev = this.addLink(tr, titles.offer(tr.t), prev);
	}

	this.page.className = 'album';
};

GetTracks.prototype.navigate = function (hash) {
	player.play({ak: hash.datum, t: hash.datum, prev: null, next: null});
	location.replace(this.here);
};

function SubPage(cd) {
	this.page = document.createElement('div');
	this.page.className = 'subpage';
	this.titles = new UniqueTitleSet();
	this.addHeader(cd);
}

SubPage.resolveCD = function (libline, pk) {
	return '#librarylist/' + encodeURIComponent(libline) + '/' + encodeURIComponent(pk);
};

SubPage.prototype.resolve = Base.prototype.resolve;

SubPage.prototype.addHeader = function (cd) {
	GetTracks.prototype.addHeader.call(this, 'h2');
	var a = document.createElement('a');
	a.href = SubPage.resolveCD(cd.libline, cd.pk);
	a.textContent = cd.t;
	this.heading.appendChild(a);
	this.cover.src = GetTracks.resolveCover(cd.ak);
	this.desc.textContent = cd.d;
	this.catcode.textContent = cd.catcode;
	this.ttracks.textContent = cd.ttracks;
	this.reldate.textContent = cd.reldate;
};

SubPage.prototype.addLink = GetTracks.prototype.addLink;

function AdditionalTracks(id, here, doc) {
	Base.call(this, id, here);

	this.setTitle(AdditionalTracks.TITLE);
	this.addHeader('at loading');
	this.setFields(doc);
}

AdditionalTracks.TITLE = 'Additional Tracks';
AdditionalTracks.CD_ATTRS = ['pk', 'ak', 't', 'd', 'libline', 'catcode', 'ttracks', 'reldate'];
AdditionalTracks.TR_ATTRS = ['ak', 't', 'd', 'trtime', 'trnum', 'fkcd'];

AdditionalTracks.prototype = Object.create(Base.prototype);
AdditionalTracks.prototype.constructor = AdditionalTracks;

AdditionalTracks.prototype.addNothing = function () {
	var div = document.createElement('div');
	div.className = 'nothing';
	this.page.appendChild(div);
};

AdditionalTracks.prototype.setCounts = function (counts) {
	if (counts.cd_at_pages == '0') this.addNothing();
};

AdditionalTracks.prototype.setFields = function (doc) {
	if (doc) {
		var map = {}, i, subPage;
		this.setCounts(BlueAccessSimple.getCounts(doc));

		var cds_at = XMLTree.getElementChildren(doc.getElementsByTagName('cds_at')[0]);
		for (i = 0; i < cds_at.length; i++) {
			var cd = BlueAccessSimple.getAttrs(cds_at[i], AdditionalTracks.CD_ATTRS);
			subPage = new SubPage(cd);
			map[cd.pk] = subPage;

			this.page.appendChild(subPage.page);
		}

		var prev = null;
		var tracks_at = XMLTree.getElementChildren(doc.getElementsByTagName('tracks_at')[0]);
		for (i = 0; i < tracks_at.length; i++) {
			var tr = BlueAccessSimple.getAttrs(tracks_at[i], AdditionalTracks.TR_ATTRS);

			subPage = map[tr.fkcd];
			prev = subPage.addLink(tr, subPage.titles.offer(tr.t), prev);
		}

		this.page.className = 'album at';
	} else {
		this.page.className = 'album at loading';
	}
};

AdditionalTracks.prototype.navigate = GetTracks.prototype.navigate;

function BlueAccessSimple(id, here, title, type, param) {
	Base.call(this, id, here);
	this.map = null;

	this.setTitle(title);
	this.addHeader('bas loading');

	Base.ajax(BlueAccessSimple.resolveSearch(type, param, this.id), 'document', this, 'onLoad');
}

BlueAccessSimple.PAGES_ATTRS = ['cd_pages', 'cd_at_pages'];
BlueAccessSimple.CD_ATTRS = ['pk', 't', 'd', 'catcode'];

BlueAccessSimple.getAttrs = function (node, attrs) {
	var ret = {};
	for (var i = 0; i < attrs.length; i++) {
		var attr = attrs[i];
		ret[attr] = node.getAttribute(attr);
	}
	return ret;
};

BlueAccessSimple.getCounts = function (doc) {
	var pages = doc.getElementsByTagName('pages')[0];
	return BlueAccessSimple.getAttrs(pages, BlueAccessSimple.PAGES_ATTRS);
};

BlueAccessSimple.resolveSearch = function (type, param, value) {
	var url = 'blue_access_simple.php?type=' + type;
	if (param) url += '&' + param + '=' + encodeURIComponent(value);
	return url + '&sp=1';
};

BlueAccessSimple.prototype = Object.create(Base.prototype);
BlueAccessSimple.prototype.constructor = BlueAccessSimple;

BlueAccessSimple.prototype.addHeader = function (className) {
	this.page.className = className;
	var h1 = document.createElement('h1');
	h1.textContent = this.title;
	this.atLink = document.createElement('a');
	this.atLink.className = 'at';
	this.atLink.href = this.resolve('at');
	this.atLink.textContent = AdditionalTracks.TITLE;
	this.header = document.createElement('div');
	this.header.className = 'header';
	this.header.appendChild(h1);
	this.page.appendChild(this.header);
};

BlueAccessSimple.prototype.addNothing = AdditionalTracks.prototype.addNothing;

BlueAccessSimple.prototype.setCounts = function (counts) {
	var redirect = counts.cd_pages == '0' && counts.cd_at_pages != '0';
	if (redirect) this.redirect(this.resolve('at'));
	if (counts.cd_pages == '0') this.addNothing();
	if (counts.cd_at_pages != '0') this.header.appendChild(this.atLink);
};

BlueAccessSimple.prototype.addLink = function (href, name, catcode, desc) {
	var span = document.createElement('span');
	span.className = 'left catcode';
	span.textContent = catcode;
	var a = document.createElement('a');
	a.className = 'name';
	a.href = href;
	a.textContent = name;
	var pre = document.createElement('pre');
	pre.textContent = desc;
	var div = document.createElement('div');
	div.className = 'item';
	div.appendChild(span);
	div.appendChild(a);
	div.appendChild(pre);
	this.page.appendChild(div);
};

BlueAccessSimple.prototype.onLoad = function (doc) {
	this.map = {at: doc};
	this.setCounts(BlueAccessSimple.getCounts(doc));

	var cds = XMLTree.getElementChildren(doc.getElementsByTagName('cds')[0]);
	for (var i = 0; i < cds.length; i++) {
		var cd = BlueAccessSimple.getAttrs(cds[i], BlueAccessSimple.CD_ATTRS);
		this.map[cd.pk] = {title: cd.t, desc: cd.d, code: cd.catcode};
		this.addLink(this.resolve(cd.pk), cd.t, cd.catcode, cd.d);
	}

	if (this.next) this.next.setFields(this.map[this.next.id]);
	this.page.className = 'bas';
};

BlueAccessSimple.prototype.create = function (id) {
	var here = this.resolve(id);
	var fields = this.map && this.map[id];
	if (id == 'at') return new AdditionalTracks(id, here, fields);
	return new GetTracks(id, here, fields);
};

function XMLTree(id, here, title, resource, type, param) {
	Base.call(this, id, here);
	this.type = type;
	this.param = param;
	this.map = null;

	this.setTitle(title);
	this.addHeader('tree loading');

	Base.ajax(resource, 'text', this, 'onLoad');
}

XMLTree.derive = function (id, title, resource, type, param) {
	var derived = function XMLTreeDerived(here) {
		XMLTree.call(this, id, here, title, resource, type, param);
	};

	derived.ID = id;
	derived.TITLE = title;

	derived.prototype = Object.create(XMLTree.prototype);
	derived.prototype.constructor = derived;

	return derived;
};

XMLTree.cleanXML = function (xml) {
	var cleanSource = '<doc>' + xml.replace(/&(?=\s|&|$)/g, '&amp;') + '<\/doc>';
	return new DOMParser().parseFromString(cleanSource, 'text/xml');
};

XMLTree.getElementChildren = function (node) {
	if ('children' in node) return node.children;
	var children = [];
	for (var child = node.firstElementChild; child; child = child.nextElementSibling) children.push(child);
	return children;
};

XMLTree.prototype = Object.create(Base.prototype);
XMLTree.prototype.constructor = XMLTree;

XMLTree.prototype.walkNode = function (node, parent) {
	var ret = {
		label: node.getAttribute('label'),
		data: node.getAttribute('data'),
		parent: parent,
		children: null
	};
	if (node.firstElementChild) ret.children = this.walkChildren(node, ret);
	this.map[ret.data] = ret;
	return ret;
};

XMLTree.prototype.walkChildren = function (node, parent) {
	var ret = [];
	var children = XMLTree.getElementChildren(node);
	for (var i = 0; i < children.length; i++) ret.push(this.walkNode(children[i], parent));
	return ret;
};

XMLTree.prototype.populate = function (children) {
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		this.addLink(this.resolve(child.data), child.label);
	}
};

XMLTree.prototype.createInternal = function (node) {
	var id = node.data;
	if (node.children) return new XMLNode(id, this.resolve(id), this, node);
	else return new BlueAccessSimple(id, this.resolve(id), node.label, this.type, this.param);
};

XMLTree.prototype.onLoad = function (xml) {
	var start = Date.now();

	var doc = XMLTree.cleanXML(xml);
	this.map = {};
	this.populate(this.walkChildren(doc.documentElement, null));

	if (this.next) {
		var placeholder = this.next;
		var node = this.map[placeholder.id];
		// replace placeholder
		this.next = this.createInternal(node);
		this.next.next = placeholder.next;
		this.next.add(placeholder.crumb);
		if (active === placeholder) {
			placeholder.deactivate();
			this.next.activate();
			active = this.next;
		}
		placeholder.remove();
		placeholder.next = null;
		// insert strict ancestors
		for (node = node.parent; node; node = node.parent) {
			var next = this.next;
			this.next = this.createInternal(node);
			this.next.next = next;
			this.next.add(next.crumb);
		}
	}

	var finish = Date.now();
	console.log('XMLTree onLoad took ' + (finish - start) + ' ms');
	this.page.className = 'tree';
};

XMLTree.prototype.create = function (id) {
	if (!this.map) return new Placeholder(id, this.resolve(id));
	if (id in this.map) return this.createInternal(this.map[id]);
	else throw new Error('unrecognized group');
};

XMLTree.prototype.navigate = function (hash) {
	// insert strict ancestors
	for (var node = this.map && this.map[hash.datum].parent; node; node = node.parent) hash = {
		datum: node.data,
		next: hash
	};
	Base.prototype.navigate.call(this, hash);
};

function Placeholder(id, here) {
	Base.call(this, id, here);

	this.setTitle('(' + this.id + ')');
	this.addHeader('loading');
};

Placeholder.prototype = Object.create(Base.prototype);
Placeholder.prototype.constructor = Placeholder;

Placeholder.prototype.create = BlueAccessSimple.prototype.create;

function XMLNode(id, here, tree, node) {
	Base.call(this, id, here);
	this.tree = tree;

	this.setTitle(node.label);
	this.addHeader('tree');
	this.populate(node.children);
}

XMLNode.prototype = Object.create(Base.prototype);
XMLNode.prototype.constructor = XMLNode;

XMLNode.prototype.resolve = function (id) {
	return this.tree.resolve(id);
};

XMLNode.prototype.create = function (id) {
	return this.tree.create(id);
};

XMLNode.prototype.populate = XMLTree.prototype.populate;

function NewRelease(id, here, title) {
	Base.call(this, id, here);
	this.map = null;

	this.page.className = 'bas loading';
	this.heading = document.createElement('h1');
	var div = document.createElement('div');
	div.className = 'header';
	div.appendChild(this.heading);
	this.page.appendChild(div);
	this.setTitle(title || '(' + id + ')');

	Base.ajax(NewRelease.resolveSearch(this.id), 'text', this, 'onLoad');
};

NewRelease.resolveSearch = function (newrelease_id) {
	return 'newreleases.php?newrelease_id=' + encodeURIComponent(newrelease_id);
};

NewRelease.prototype = Object.create(Base.prototype);
NewRelease.prototype.constructor = NewRelease;

NewRelease.prototype.setTitle = function (title) {
	Base.prototype.setTitle.call(this, title);
	this.heading.textContent = title;
};

NewRelease.prototype.addLink = BlueAccessSimple.prototype.addLink;

NewRelease.prototype.onLoad = function (urlencoded) {
	var data = NewReleases.parseUrlencoded(urlencoded);
	this.map = {};

	for (var i = 0; i < data.length; i++) {
		var cd = data[i];
		this.map[cd.pkCD] = {title: cd.cdTitle, desc: cd.cdDescription, code: cd.CatalogCode};
		this.addLink(this.resolve(cd.pkCD), cd.cdTitle, cd.CatalogCode, cd.cdDescription);
	}

	if (this.next) this.next.setFields(this.map[this.next.id]);
	this.page.className = 'bas';
}

NewRelease.prototype.create = function (id) {
	return new GetTracks(id, this.resolve(id), this.map && this.map[id]);
};

function NewReleases(here) {
	Base.call(this, NewReleases.ID, here);
	this.map = null;

	this.setTitle(NewReleases.TITLE);
	this.addHeader('newreleases loading');

	Base.ajax('newreleases.php', 'text', this, 'onLoad');
}

NewReleases.ID = 'newreleases';
NewReleases.TITLE = 'New Releases';
NewReleases.PAIR = /^cd(\d+)_(\w+)=(.*)$/;
NewReleases.PLUS = /\+/g;

NewReleases.parseUrlencoded = function (urlencoded) {
	var pairs = urlencoded.split('&');
	var data = [];
	for (var i = 1; i < pairs.length; i++) {
		var match = NewReleases.PAIR.exec(pairs[i]);
		if (!match) break;
		match[1] = parseInt(match[1], 10);
		if (!(match[1] in data)) data[match[1]] = {};
		data[match[1]][match[2]] = decodeURIComponent(match[3].replace(NewReleases.PLUS, ' '));
	}
	return data;
};

NewReleases.prototype = Object.create(Base.prototype);
NewReleases.prototype.constructor = NewReleases;

NewReleases.prototype.onLoad = function (urlencoded) {
	var data = NewReleases.parseUrlencoded(urlencoded);
	this.map = {};

	for (var i = 0; i < data.length; i++) {
		var newrelease = data[i];
		newrelease.title = newrelease.month + ' ' + newrelease.year;
		this.map[newrelease.id] = newrelease;
		this.addLink(this.resolve(newrelease.id), newrelease.title);
	}

	if (this.next) this.next.setTitle(this.map[this.next.id].title);
	this.page.className = 'newreleases';
};

NewReleases.prototype.create = function (id) {
	return new NewRelease(id, this.resolve(id), this.map && this.map[id].title);
};

function SearchForm(id, here, title) {
	Base.call(this, id, here);

	this.setTitle(title);
	this.addHeader('searchform');

	var searchForm = this;
	this.input = document.createElement('input');
	var label = document.createElement('label');
	label.appendChild(document.createTextNode('Search Text'));
	label.appendChild(this.input);
	var submit = document.createElement('input');
	submit.type = 'submit';
	submit.value = 'Search';
	var form = document.createElement('form');
	form.appendChild(label);
	form.appendChild(submit);
	form.addEventListener('submit', function (e) {
		location = searchForm.resolve(searchForm.input.value);
		e.preventDefault();
	});
	this.page.appendChild(form);
}

SearchForm.derive = function (id, title) {
	var derived = function SearchFormDerived(here) {
		SearchForm.call(this, id, here, title);
	};

	derived.ID = id;
	derived.TITLE = title;

	derived.prototype = Object.create(SearchForm.prototype);
	derived.prototype.constructor = derived;

	return derived;
};

SearchForm.prototype = Object.create(Base.prototype);
SearchForm.prototype.constructor = SearchForm;

SearchForm.prototype.activate = function () {
	Base.prototype.activate.call(this);
	this.input.focus();
};

SearchForm.prototype.create = function (id) {
	var type = 'searchadv&' + this.id + '=1'; // the worst hack here
	return new BlueAccessSimple(id, this.resolve(id), id, type, 'searchtext');
};

function Root() {
	Base.call(this, null, '#');

	this.title = 'Untitled-5';
	this.addHeader('root');
	for (var i = 0; i < Root.TYPES.length; i++) {
		var type = Root.TYPES[i];
		this.addLink('#' + type.ID, type.TITLE + ' \xbb');
	}
}

Root.TYPES = [
	XMLTree.derive('categories', 'Categories', 'categories.xml', 'category', 'categoryid'),
	XMLTree.derive('styles', 'Styles', 'styles.xml', 'styles', 'categoryid'),
	XMLTree.derive('wkt', 'Well-Known Tunes', 'wkt.xml', 'wkt', 'categoryid'),
	XMLTree.derive('librarylist', 'Libraries & Cover Art', BlueAccessSimple.resolveSearch('librarylist'), 'libline', 'libline'),
	NewReleases,
	SearchForm.derive('bytrtitle', 'Search by Track Title'),
	SearchForm.derive('bycdtitle', 'Search by CD Title')
];

Root.prototype = Object.create(Base.prototype);
Root.prototype.constructor = Root;

Root.prototype.add = function () {
	var span = document.createElement('span');
	span.className = 'root';
	span.appendChild(this.crumb);
	nav.appendChild(span);
};

Root.prototype.remove = function () {
	throw 'no';
};

Root.prototype.create = function (id) {
	var here = '#' + encodeURIComponent(id);
	for (var i = 0; i < Root.TYPES.length; i++) {
		var Type = Root.TYPES[i];
		if (Type.ID != id) continue;
		return new Type(here);
	}
	throw new Error('unrecognized type');
}

document.addEventListener('DOMContentLoaded', function (e) {
	console.log('entering DOMContentLoaded'); // %%%
	nav = document.createElement('div');
	nav.className = 'nav';
	main = document.createElement('div');
	main.className = 'main';

	root = new Root();
	root.add();
	player = new RTMPPlayer();
	player.add();

	document.body.appendChild(nav);
	document.body.appendChild(main);

	player.addUi();

	window.addEventListener('hashchange', onHashChange);
	onHashChange(null);
});
console.log('app.js ready'); // %%%
