import platform from '../util/platform'
import BrowserDOMElement from './BrowserDOMElement'
import MemoryDOMElement from './MemoryDOMElement'

/**
  A Bridge to the default DOMElement implementation, either BrowserDOMElement, or MemoryDOMElement.
*/
const DefaultDOMElement = {}

DefaultDOMElement.createDocument = function (format, opts) {
  return _getDefaultImpl().createDocument(format, opts)
}

/* istanbul ignore next */
DefaultDOMElement.createElement = function (tagName) {
  console.error('DEPRECATED: every element should have an ownerDocument. Use DefaultDOMElement.createDocument() to create a document first')
  const doc = DefaultDOMElement.createDocument('html')
  return doc.createElement(tagName)
}

/* istanbul ignore next */
DefaultDOMElement.createTextNode = function (text) {
  console.error('DEPRECATED: every element should have a ownerDocument. Use DefaultDOMElement.createDocument() to create a document first')
  const doc = DefaultDOMElement.createDocument('html')
  return doc.createTextNode(text)
}

/*
  A wrapper for Browser's `window` providing
  the DOMElement's eventlistener API.
*/
DefaultDOMElement.getBrowserWindow = function () {
  return _getDefaultImpl().getBrowserWindow()
}

/*
  @param {String} html
  @returns {DOMElement|DOMElement[]}
*/
DefaultDOMElement.parseHTML = function (html, options) {
  return _getDefaultImpl().parseMarkup(html, 'html', options)
}

/*
  @param {String} xml
  @returns {DOMElement|DOMElement[]}
*/
DefaultDOMElement.parseXML = function (xml, options) {
  return _getDefaultImpl().parseMarkup(xml, 'xml', options)
}

DefaultDOMElement.parseSnippet = function (str, format) {
  return _getDefaultImpl().parseMarkup(str, format, { snippet: true })
}

DefaultDOMElement.wrap =
DefaultDOMElement.wrapNativeElement = function (nativeEl) {
  if (!nativeEl) throw new Error('Illegal argument')
  return _getDefaultImpl().wrap(nativeEl)
}

DefaultDOMElement.unwrap = function (nativeEl) {
  if (!nativeEl) throw new Error('Illegal argument')
  return _getDefaultImpl().unwrap(nativeEl)
}

// TODO: this should not be part of DefaultDOMElement
/* istanbul ignore next */
DefaultDOMElement.isReverse = function (anchorNode, anchorOffset, focusNode, focusOffset) {
  return _getDefaultImpl().isReverse(anchorNode, anchorOffset, focusNode, focusOffset)
}

// used for testing
DefaultDOMElement._forceMemoryDOM = false

function _getDefaultImpl () {
  if (DefaultDOMElement._forceMemoryDOM) {
    return MemoryDOMElement
  } else if (platform.inBrowser || platform.inElectron) {
    return BrowserDOMElement
  } else {
    return MemoryDOMElement
  }
}

export default DefaultDOMElement
