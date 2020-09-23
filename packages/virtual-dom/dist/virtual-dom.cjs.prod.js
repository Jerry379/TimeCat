'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class NodeStore {
    constructor() {
        this.createNodeId = () => NodeStore.nodeId++;
        this.init();
    }
    init() {
        this.nodeMap = new Map();
        this.idMap = new WeakMap();
    }
    reset() {
        this.nodeMap.clear();
    }
    getNode(id) {
        return this.nodeMap.get(id) || null;
    }
    addNode(node, id = this.createNodeId()) {
        this.idMap.set(node, id);
        this.nodeMap.set(id, node);
        return id;
    }
    removeNode(id) {
        this.nodeMap.delete(id);
        this.idMap.delete(this.getNode(id));
    }
    getNodeId(node) {
        return this.idMap.get(node);
    }
    updateNode(id, node) {
        this.idMap.set(node, id);
        this.nodeMap.set(id, node);
    }
}
NodeStore.nodeId = 1;
const nodeStore = new NodeStore();

const snapshot = () => window.G_REPLAY_DATA && window.G_REPLAY_DATA.snapshot.data;
const href = () => snapshot().href;
function isElementNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
}
function completeCssHref(str, parentVNode) {
    return str.replace(/(url\(['"]?((\/{1,2}|\.\.?\/)[^'"]*?)['"]?(?=\)))/g, (string, b, url) => {
        if (!url.startsWith('data')) {
            const baseUrl = (parentVNode === null || parentVNode === void 0 ? void 0 : parentVNode.attrs['css-url']) || href();
            const newUrl = new URL(url, baseUrl);
            return string.replace(url, newUrl.href);
        }
        return string;
    });
}
function completeAttrHref(str, node) {
    if (str.startsWith('data')) {
        return str;
    }
    if (node) {
        setTimeout(() => {
            const doc = node.getRootNode();
            const context = doc.defaultView;
            const { href, path } = (context === null || context === void 0 ? void 0 : context.G_REPLAY_LOCATION) || {};
            if (path && href) {
                const relationHref = new URL(path, href);
                const attrs = node.getAttributeNames();
                attrs
                    .filter(key => ~['src', 'href'].indexOf(key))
                    .forEach(key => {
                    const newHref = new URL(str, relationHref).href;
                    if (node.getAttribute(key) !== newHref) {
                        node.setAttribute(key, newHref);
                    }
                });
            }
        });
    }
    return new URL(str, href()).href;
}
function isHideComment(node) {
    if (!node) {
        return false;
    }
    return node.nodeType === Node.COMMENT_NODE && node.textContent === 'hidden';
}

const getVNodeByEl = (el, isSVG) => {
    if (isElementNode(el)) {
        return {
            id: nodeStore.createNodeId(),
            type: el.nodeType,
            attrs: getAttr(el),
            tag: el.tagName.toLocaleLowerCase(),
            children: [],
            extra: getExtra(el, isSVG)
        };
    }
    else {
        return {
            id: nodeStore.createNodeId(),
            type: el.nodeType,
            value: el.textContent
        };
    }
};
const getAttr = (el) => {
    const resAttr = {};
    const { attributes } = el;
    if (attributes && attributes.length) {
        return Object.values(attributes).reduce((ret, attr) => {
            const [name, value] = extraAttr(attr);
            if (name) {
                ret[name] = value;
            }
            return ret;
        }, resAttr);
    }
    return resAttr;
};
function getExtra(node, isSVG) {
    const { tagName } = node;
    const extra = {};
    const props = {};
    if (isSVG || tagName.toLowerCase() === 'svg') {
        extra.isSVG = true;
    }
    if (tagName === 'INPUT') {
        const { checked, value } = node;
        if (value !== undefined) {
            props.value = value;
        }
        if (checked !== undefined) {
            props.checked = checked;
        }
    }
    const scrollLeft = node.scrollLeft;
    const scrollTop = node.scrollTop;
    if (scrollTop || scrollLeft) {
        props.scroll = {
            left: scrollLeft,
            top: scrollTop
        };
    }
    if (Object.keys(props).length) {
        extra.props = props;
    }
    return extra;
}
const extraAttr = (attr) => {
    const { name, value } = attr;
    if (name === 'href' || name === 'src') {
        if (value.startsWith('#/')) {
            return [];
        }
        return [name, value];
    }
    return [name, value];
};
const createFlatVNode = (el, isSVG = false) => {
    const vNode = getVNodeByEl(el, isSVG);
    const { id } = vNode;
    nodeStore.addNode(el, id);
    return vNode;
};
const createElement = (el, inheritSVG) => {
    const vNode = getVNodeByEl(el, inheritSVG);
    const { id } = vNode;
    nodeStore.addNode(el, id);
    if (vNode.type === Node.ELEMENT_NODE) {
        const vn = vNode;
        inheritSVG = inheritSVG || vn.extra.isSVG;
        el.childNodes.forEach((node) => {
            const child = createElement(node, inheritSVG);
            if (child) {
                vn.children.push(child);
            }
        });
    }
    return vNode;
};
const virtualDOM = {
    createElement
};

function setAttribute(node, name, value) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    if (name === 'style') {
        if (typeof value === 'string') {
            node.style.cssText = completeCssHref(value);
        }
        else if (value !== null && typeof value === 'object') {
            for (const [k, v] of Object.entries(value)) {
                if (k[0] === '-') {
                    node.style.setProperty(k, v);
                }
                else {
                    node.style[k] = v;
                }
            }
        }
        return;
    }
    if (value && typeof value === 'string' && /\.js$/.test(value)) {
        return;
    }
    if (!/^[\w\-\d]+$/.test(name)) {
        return;
    }
    if (/^on\w+$/.test(name)) {
        return;
    }
    if (value === null) {
        return node.removeAttribute(name);
    }
    value = String(value);
    if (name === 'href') {
        value = completeAttrHref(String(value), node);
    }
    if (name === 'background' || name === 'src') {
        if (value.startsWith('data:')) ;
        else {
            value = completeAttrHref(String(value), node);
        }
    }
    if (name === 'srcset') {
        const srcArray = value.split(',');
        value = srcArray.map(src => completeAttrHref(src.trim(), node)).toString();
    }
    if (value.startsWith('/')) {
        value = completeAttrHref(value, node);
    }
    return node.setAttribute(name, value);
}

function convertVNode(vNode, parent) {
    if (vNode === null || vNode === undefined) {
        return null;
    }
    const vs = vNode;
    if (vNode.type === Node.COMMENT_NODE) {
        return createCommentNode(vs);
    }
    if (vNode.type === Node.TEXT_NODE) {
        if (parent && parent.tag === 'style') {
            vs.value = completeCssHref(vs.value, parent);
        }
        return createText(vs);
    }
    const vn = vNode;
    const output = createNode(vn);
    if ((vn.children && vn.children.length) || (output.childNodes && output.childNodes.length)) {
        travel(vn, output);
    }
    return output;
}
function travel(vNode, node) {
    const nodeChildren = [];
    const vNodeChildren = vNode.children.slice();
    vNodeChildren.forEach(vChild => {
        let child = nodeChildren.pop();
        child = convertVNode(vChild, vNode);
        if (child) {
            if (isHideComment(node.lastChild)) {
                setAttribute(child, 'style', 'visibility: hidden');
            }
            node.appendChild(child);
        }
    });
}
function createProps(vNode, node) {
    const { props } = vNode.extra;
    if (props) {
        for (const [key, val] of Object.entries(props)) {
            if (key === 'scroll') {
                const { left, top } = val;
                setTimeout(() => {
                    node.scrollTop = top;
                    node.scrollLeft = left;
                }, 1000);
            }
            else {
                node[key] = val;
            }
        }
    }
}
function createAttributes(vNode, node) {
    const attrs = getAttributes(vNode);
    for (const [name, val] of Object.entries(attrs)) {
        setAttribute(node, name, val);
    }
    if (vNode.tag === 'a') {
        node.setAttribute('target', '_blank');
    }
}
function getAttributes(vNode) {
    const attrs = Object.assign({}, vNode.attrs);
    if (vNode.tag === 'iframe') {
        attrs['disabled-src'] = attrs.src;
        delete attrs.src;
    }
    return attrs;
}
function createSpecialNode(vsNode) {
    const { type, value, id } = vsNode;
    let output;
    switch (type) {
        case Node.TEXT_NODE:
            output = document.createTextNode(value);
            break;
        case Node.COMMENT_NODE:
            output = document.createComment(value);
            break;
    }
    nodeStore.updateNode(id, output);
    return output;
}
function createNode(vNode) {
    const { id, extra } = vNode;
    const { isSVG } = extra;
    let output;
    const tagName = transformTagName(vNode.tag);
    if (isSVG) {
        output = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    }
    else {
        output = document.createElement(tagName);
    }
    createAttributes(vNode, output);
    createProps(vNode, output);
    nodeStore.updateNode(id, output);
    return output;
}
function transformTagName(tag) {
    const tagMap = {
        script: 'noscript',
        altglyph: 'altGlyph',
        altglyphdef: 'altGlyphDef',
        altglyphitem: 'altGlyphItem',
        animatecolor: 'animateColor',
        animatemotion: 'animateMotion',
        animatetransform: 'animateTransform',
        clippath: 'clipPath',
        feblend: 'feBlend',
        fecolormatrix: 'feColorMatrix',
        fecomponenttransfer: 'feComponentTransfer',
        fecomposite: 'feComposite',
        feconvolvematrix: 'feConvolveMatrix',
        fediffuselighting: 'feDiffuseLighting',
        fedisplacementmap: 'feDisplacementMap',
        fedistantlight: 'feDistantLight',
        feflood: 'feFlood',
        fefunca: 'feFuncA',
        fefuncb: 'feFuncB',
        fefuncg: 'feFuncG',
        fefuncr: 'feFuncR',
        fegaussianblur: 'feGaussianBlur',
        feimage: 'feImage',
        femerge: 'feMerge',
        femergenode: 'feMergeNode',
        femorphology: 'feMorphology',
        feoffset: 'feOffset',
        fepointLight: 'fePointLight',
        fespecularlighting: 'feSpecularLighting',
        fespotlight: 'feSpotLight',
        fetile: 'feTile',
        feturbulence: 'feTurbulence',
        foreignobject: 'foreignObject',
        lineargradient: 'linearGradient',
        radialgradient: 'radialGradient',
        textpath: 'textPath'
    };
    const tagName = tagMap[tag] || tag;
    return tagName;
}
function createText(vs) {
    const { value, id } = vs;
    const output = document.createTextNode(value);
    nodeStore.updateNode(id, output);
    return output;
}
function createCommentNode(vs) {
    const { value, id } = vs;
    const output = document.createComment(value);
    nodeStore.updateNode(id, output);
    return output;
}

exports.convertVNode = convertVNode;
exports.createElement = createElement;
exports.createFlatVNode = createFlatVNode;
exports.createNode = createNode;
exports.createSpecialNode = createSpecialNode;
exports.setAttribute = setAttribute;
exports.virtualDOM = virtualDOM;
//# sourceMappingURL=virtual-dom.cjs.prod.js.map
