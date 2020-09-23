class e{constructor(){this.createNodeId=()=>e.nodeId++,this.init()}init(){this.nodeMap=new Map,this.idMap=new WeakMap}reset(){this.nodeMap.clear()}getNode(e){return this.nodeMap.get(e)||null}addNode(e,t=this.createNodeId()){return this.idMap.set(e,t),this.nodeMap.set(t,e),t}removeNode(e){this.nodeMap.delete(e),this.idMap.delete(this.getNode(e))}getNodeId(e){return this.idMap.get(e)}updateNode(e,t){this.idMap.set(t,e),this.nodeMap.set(e,t)}}e.nodeId=1;const t=new e,n=()=>(window.G_REPLAY_DATA&&window.G_REPLAY_DATA.snapshot.data).href;function o(e,t){return e.replace(/(url\(['"]?((\/{1,2}|\.\.?\/)[^'"]*?)['"]?(?=\)))/g,(e,o,r)=>{if(!r.startsWith("data")){const o=(null==t?void 0:t.attrs["css-url"])||n(),i=new URL(r,o);return e.replace(r,i.href)}return e})}function r(e,t){return e.startsWith("data")?e:(t&&setTimeout(()=>{const n=t.getRootNode().defaultView,{href:o,path:r}=(null==n?void 0:n.G_REPLAY_LOCATION)||{};if(r&&o){const n=new URL(r,o);t.getAttributeNames().filter(e=>~["src","href"].indexOf(e)).forEach(o=>{const r=new URL(e,n).href;t.getAttribute(o)!==r&&t.setAttribute(o,r)})}}),new URL(e,n()).href)}const i=(e,n)=>e.nodeType===Node.ELEMENT_NODE?{id:t.createNodeId(),type:e.nodeType,attrs:s(e),tag:e.tagName.toLocaleLowerCase(),children:[],extra:a(e,n)}:{id:t.createNodeId(),type:e.nodeType,value:e.textContent},s=e=>{const t={},{attributes:n}=e;return n&&n.length?Object.values(n).reduce((e,t)=>{const[n,o]=c(t);return n&&(e[n]=o),e},t):t};function a(e,t){const{tagName:n}=e,o={},r={};if((t||"svg"===n.toLowerCase())&&(o.isSVG=!0),"INPUT"===n){const{checked:t,value:n}=e;void 0!==n&&(r.value=n),void 0!==t&&(r.checked=t)}const i=e.scrollLeft,s=e.scrollTop;return(s||i)&&(r.scroll={left:i,top:s}),Object.keys(r).length&&(o.props=r),o}const c=e=>{const{name:t,value:n}=e;return("href"===t||"src"===t)&&n.startsWith("#/")?[]:[t,n]},d=(e,n=!1)=>{const o=i(e,n),{id:r}=o;return t.addNode(e,r),o},l=(e,n)=>{const o=i(e,n),{id:r}=o;if(t.addNode(e,r),o.type===Node.ELEMENT_NODE){const t=o;n=n||t.extra.isSVG,e.childNodes.forEach(e=>{const o=l(e,n);o&&t.children.push(o)})}return o},f={createElement:l};function u(e,t,n){if(e.nodeType===Node.ELEMENT_NODE)if("style"!==t){if((!n||"string"!=typeof n||!/\.js$/.test(n))&&/^[\w\-\d]+$/.test(t)&&!/^on\w+$/.test(t)){if(null===n)return e.removeAttribute(t);if(n=String(n),"href"===t&&(n=r(String(n),e)),"background"!==t&&"src"!==t||n.startsWith("data:")||(n=r(String(n),e)),"srcset"===t){const t=n.split(",");n=t.map(t=>r(t.trim(),e)).toString()}return n.startsWith("/")&&(n=r(n,e)),e.setAttribute(t,n)}}else if("string"==typeof n)e.style.cssText=o(n);else if(null!==n&&"object"==typeof n)for(const[t,o]of Object.entries(n))"-"===t[0]?e.style.setProperty(t,o):e.style[t]=o}function p(e,n){if(null==e)return null;const r=e;if(e.type===Node.COMMENT_NODE)return function(e){const{value:n,id:o}=e,r=document.createComment(n);return t.updateNode(o,r),r}(r);if(e.type===Node.TEXT_NODE)return n&&"style"===n.tag&&(r.value=o(r.value,n)),function(e){const{value:n,id:o}=e,r=document.createTextNode(n);return t.updateNode(o,r),r}(r);const i=e,s=N(i);return(i.children&&i.children.length||s.childNodes&&s.childNodes.length)&&function(e,t){const n=[];e.children.slice().forEach(o=>{let r=n.pop();r=p(o,e),r&&(function(e){return!!e&&e.nodeType===Node.COMMENT_NODE&&"hidden"===e.textContent}(t.lastChild)&&u(r,"style","visibility: hidden"),t.appendChild(r))})}(i,s),s}function h(e,t){const n=function(e){const t=Object.assign({},e.attrs);"iframe"===e.tag&&(t["disabled-src"]=t.src,delete t.src);return t}(e);for(const[e,o]of Object.entries(n))u(t,e,o);"a"===e.tag&&t.setAttribute("target","_blank")}function g(e){const{type:n,value:o,id:r}=e;let i;switch(n){case Node.TEXT_NODE:i=document.createTextNode(o);break;case Node.COMMENT_NODE:i=document.createComment(o)}return t.updateNode(r,i),i}function N(e){const{id:n,extra:o}=e,{isSVG:r}=o;let i;const s={script:"noscript",altglyph:"altGlyph",altglyphdef:"altGlyphDef",altglyphitem:"altGlyphItem",animatecolor:"animateColor",animatemotion:"animateMotion",animatetransform:"animateTransform",clippath:"clipPath",feblend:"feBlend",fecolormatrix:"feColorMatrix",fecomponenttransfer:"feComponentTransfer",fecomposite:"feComposite",feconvolvematrix:"feConvolveMatrix",fediffuselighting:"feDiffuseLighting",fedisplacementmap:"feDisplacementMap",fedistantlight:"feDistantLight",feflood:"feFlood",fefunca:"feFuncA",fefuncb:"feFuncB",fefuncg:"feFuncG",fefuncr:"feFuncR",fegaussianblur:"feGaussianBlur",feimage:"feImage",femerge:"feMerge",femergenode:"feMergeNode",femorphology:"feMorphology",feoffset:"feOffset",fepointLight:"fePointLight",fespecularlighting:"feSpecularLighting",fespotlight:"feSpotLight",fetile:"feTile",feturbulence:"feTurbulence",foreignobject:"foreignObject",lineargradient:"linearGradient",radialgradient:"radialGradient",textpath:"textPath"}[a=e.tag]||a;var a;return i=r?document.createElementNS("http://www.w3.org/2000/svg",s):document.createElement(s),h(e,i),function(e,t){const{props:n}=e.extra;if(n)for(const[e,o]of Object.entries(n))if("scroll"===e){const{left:e,top:n}=o;setTimeout(()=>{t.scrollTop=n,t.scrollLeft=e},1e3)}else t[e]=o}(e,i),t.updateNode(n,i),i}export{p as convertVNode,l as createElement,d as createFlatVNode,N as createNode,g as createSpecialNode,u as setAttribute,f as virtualDOM};
//# sourceMappingURL=virtual-dom.esm.prod.js.map
