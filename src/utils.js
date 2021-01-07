// https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
let supportsPassive = false
try {
  let opts = Object.defineProperty({}, 'passive', {
    get: function() {
      supportsPassive = true
    },
  })
  window.addEventListener('test', null, opts)
} catch (e) {}

const elementHandlers = {} /* [element, event] -> elementHandler */
const scrollerHandlers = {} /* [element, event] -> [scrollerHandler, ...] */
const $dispatchEvents = function(handlers, e) {
  // console.log({ what: 'dispatch', handlers, scrollerHandlers, elementHandlers });
  if (handlers === undefined || handlers.length === 0) {
    return
  }
  handlers.forEach(scrollerHandler => scrollerHandler(e))
}

let elementCounter = 0

const removeMatchingKeys = (obj, pred) => {
  for (let prop in obj) {
    // console.log({obj, prop, objprop: obj[prop]});
    if (pred(prop)) {
      // console.log({w: 'del', obj, prop});
      delete obj[prop]
    }
  }
}

const elementKeyName = 'vueScrollToElementKey'

export default {
  $(selector) {
    if (typeof selector !== 'string') {
      return selector
    }
    return document.querySelector(selector)
  },
  on(element, events, handler, opts = { passive: false }) {
    if (!(events instanceof Array)) {
      events = [events]
    }

    if (element.dataset[elementKeyName] === undefined) {
      elementCounter += 1
      element.dataset[elementKeyName] = `${elementCounter}`
    }

    const elementKey = element.dataset[elementKeyName]

    for (let i = 0; i < events.length; i++) {
      const evtName = events[i]
      const key = `${elementKey}-${evtName}`
      const scrollHandler = e => $dispatchEvents(scrollerHandlers[key], e)

      if (elementHandlers[key] === undefined) {
        /* if the event map is undefined, we need to addEventListener */
        elementHandlers[key] = scrollHandler
        element.addEventListener(
          events[i],
          scrollHandler,
          supportsPassive ? opts : false
        )
      }

      if (scrollerHandlers[key] === undefined) {
        scrollerHandlers[key] = [handler]
      } else {
        scrollerHandlers[key].push(handler)
      }
      // console.log({ what: 'on', key, scrollerHandlers, elementHandlers});
    }
  },
  off(element, events, handler) {
    if (!(events instanceof Array)) {
      events = [events]
    }
    const elementKey = element.dataset[elementKeyName]
    for (let i = 0; i < events.length; i++) {
      const evtName = events[i]
      const key = `${elementKey}-${evtName}`
      scrollerHandlers[key].pop(handler)
      // console.log({ what: 'off', key, scrollerHandlers, elementHandlers});
    }
  },
  unmount(element) {
    if (element === undefined) {
      return
    }
    const elementKey = element.dataset[elementKeyName]
    // console.log({ unmount: 'off', element, elementKey, scrollerHandlers, elementHandlers});
    removeMatchingKeys(elementHandlers, e => e.startsWith(`${elementKey}-`))
    removeMatchingKeys(scrollerHandlers, e => e.startsWith(`${elementKey}-`))
  },
  cumulativeOffset(element) {
    let top = 0
    let left = 0

    do {
      top += element.offsetTop || 0
      left += element.offsetLeft || 0
      element = element.offsetParent
    } while (element)

    return {
      top: top,
      left: left,
    }
  },
}
