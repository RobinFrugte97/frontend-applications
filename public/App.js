'use strict';

function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, callback) {
    const unsub = store.subscribe(callback);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
// https://infra.spec.whatwg.org/#noncharacter
function spread(args) {
    const attributes = Object.assign({}, ...args);
    let str = '';
    Object.keys(attributes).forEach(name => {
        if (invalid_attribute_name_character.test(name))
            return;
        const value = attributes[name];
        if (value === undefined)
            return;
        if (value === true)
            str += " " + name;
        const escaped = String(value)
            .replace(/"/g, '&#34;')
            .replace(/'/g, '&#39;');
        str += " " + name + "=" + JSON.stringify(escaped);
    });
    return str;
}
const escaped = {
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};
function escape(html) {
    return String(html).replace(/["'&<>]/g, match => escaped[match]);
}
function each(items, fn) {
    let str = '';
    for (let i = 0; i < items.length; i += 1) {
        str += fn(items[i], i);
    }
    return str;
}
const missing_component = {
    $$render: () => ''
};
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.head
            };
        },
        $$render
    };
}
function add_attribute(name, value, boolean) {
    if (value == null || (boolean && !value))
        return '';
    return ` ${name}${value === true ? '' : `=${typeof value === 'string' ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe,
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 * @param {Stores} stores input stores
 * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
 * @param {*=}initial_value when used asynchronously
 */
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

const LOCATION = {};
const ROUTER = {};

/**
 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
 *
 * https://github.com/reach/router/blob/master/LICENSE
 * */

function getLocation(source) {
  return {
    ...source.location,
    state: source.history.state,
    key: (source.history.state && source.history.state.key) || "initial"
  };
}

function createHistory(source, options) {
  const listeners = [];
  let location = getLocation(source);

  return {
    get location() {
      return location;
    },

    listen(listener) {
      listeners.push(listener);

      const popstateListener = () => {
        location = getLocation(source);
        listener({ location, action: "POP" });
      };

      source.addEventListener("popstate", popstateListener);

      return () => {
        source.removeEventListener("popstate", popstateListener);

        const index = listeners.indexOf(listener);
        listeners.splice(index, 1);
      };
    },

    navigate(to, { state, replace = false } = {}) {
      state = { ...state, key: Date.now() + "" };
      // try...catch iOS Safari limits to 100 pushState calls
      try {
        if (replace) {
          source.history.replaceState(state, null, to);
        } else {
          source.history.pushState(state, null, to);
        }
      } catch (e) {
        source.location[replace ? "replace" : "assign"](to);
      }

      location = getLocation(source);
      listeners.forEach(listener => listener({ location, action: "PUSH" }));
    }
  };
}

// Stores history entries in memory for testing or other platforms like Native
function createMemorySource(initialPathname = "/") {
  let index = 0;
  const stack = [{ pathname: initialPathname, search: "" }];
  const states = [];

  return {
    get location() {
      return stack[index];
    },
    addEventListener(name, fn) {},
    removeEventListener(name, fn) {},
    history: {
      get entries() {
        return stack;
      },
      get index() {
        return index;
      },
      get state() {
        return states[index];
      },
      pushState(state, _, uri) {
        const [pathname, search = ""] = uri.split("?");
        index++;
        stack.push({ pathname, search });
        states.push(state);
      },
      replaceState(state, _, uri) {
        const [pathname, search = ""] = uri.split("?");
        stack[index] = { pathname, search };
        states[index] = state;
      }
    }
  };
}

// Global history uses window.history as the source if available,
// otherwise a memory history
const canUseDOM = Boolean(
  typeof window !== "undefined" &&
    window.document &&
    window.document.createElement
);
const globalHistory = createHistory(canUseDOM ? window : createMemorySource());

/**
 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
 *
 * https://github.com/reach/router/blob/master/LICENSE
 * */

const paramRe = /^:(.+)/;

const SEGMENT_POINTS = 4;
const STATIC_POINTS = 3;
const DYNAMIC_POINTS = 2;
const SPLAT_PENALTY = 1;
const ROOT_POINTS = 1;

/**
 * Check if `string` starts with `search`
 * @param {string} string
 * @param {string} search
 * @return {boolean}
 */
function startsWith(string, search) {
  return string.substr(0, search.length) === search;
}

/**
 * Check if `segment` is a root segment
 * @param {string} segment
 * @return {boolean}
 */
function isRootSegment(segment) {
  return segment === "";
}

/**
 * Check if `segment` is a dynamic segment
 * @param {string} segment
 * @return {boolean}
 */
function isDynamic(segment) {
  return paramRe.test(segment);
}

/**
 * Check if `segment` is a splat
 * @param {string} segment
 * @return {boolean}
 */
function isSplat(segment) {
  return segment[0] === "*";
}

/**
 * Split up the URI into segments delimited by `/`
 * @param {string} uri
 * @return {string[]}
 */
function segmentize(uri) {
  return (
    uri
      // Strip starting/ending `/`
      .replace(/(^\/+|\/+$)/g, "")
      .split("/")
  );
}

/**
 * Strip `str` of potential start and end `/`
 * @param {string} str
 * @return {string}
 */
function stripSlashes(str) {
  return str.replace(/(^\/+|\/+$)/g, "");
}

/**
 * Score a route depending on how its individual segments look
 * @param {object} route
 * @param {number} index
 * @return {object}
 */
function rankRoute(route, index) {
  const score = route.default
    ? 0
    : segmentize(route.path).reduce((score, segment) => {
        score += SEGMENT_POINTS;

        if (isRootSegment(segment)) {
          score += ROOT_POINTS;
        } else if (isDynamic(segment)) {
          score += DYNAMIC_POINTS;
        } else if (isSplat(segment)) {
          score -= SEGMENT_POINTS + SPLAT_PENALTY;
        } else {
          score += STATIC_POINTS;
        }

        return score;
      }, 0);

  return { route, score, index };
}

/**
 * Give a score to all routes and sort them on that
 * @param {object[]} routes
 * @return {object[]}
 */
function rankRoutes(routes) {
  return (
    routes
      .map(rankRoute)
      // If two routes have the exact same score, we go by index instead
      .sort((a, b) =>
        a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
      )
  );
}

/**
 * Ranks and picks the best route to match. Each segment gets the highest
 * amount of points, then the type of segment gets an additional amount of
 * points where
 *
 *  static > dynamic > splat > root
 *
 * This way we don't have to worry about the order of our routes, let the
 * computers do it.
 *
 * A route looks like this
 *
 *  { path, default, value }
 *
 * And a returned match looks like:
 *
 *  { route, params, uri }
 *
 * @param {object[]} routes
 * @param {string} uri
 * @return {?object}
 */
function pick(routes, uri) {
  let match;
  let default_;

  const [uriPathname] = uri.split("?");
  const uriSegments = segmentize(uriPathname);
  const isRootUri = uriSegments[0] === "";
  const ranked = rankRoutes(routes);

  for (let i = 0, l = ranked.length; i < l; i++) {
    const route = ranked[i].route;
    let missed = false;

    if (route.default) {
      default_ = {
        route,
        params: {},
        uri
      };
      continue;
    }

    const routeSegments = segmentize(route.path);
    const params = {};
    const max = Math.max(uriSegments.length, routeSegments.length);
    let index = 0;

    for (; index < max; index++) {
      const routeSegment = routeSegments[index];
      const uriSegment = uriSegments[index];

      if (routeSegment !== undefined && isSplat(routeSegment)) {
        // Hit a splat, just grab the rest, and return a match
        // uri:   /files/documents/work
        // route: /files/* or /files/*splatname
        const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

        params[splatName] = uriSegments
          .slice(index)
          .map(decodeURIComponent)
          .join("/");
        break;
      }

      if (uriSegment === undefined) {
        // URI is shorter than the route, no match
        // uri:   /users
        // route: /users/:userId
        missed = true;
        break;
      }

      let dynamicMatch = paramRe.exec(routeSegment);

      if (dynamicMatch && !isRootUri) {
        const value = decodeURIComponent(uriSegment);
        params[dynamicMatch[1]] = value;
      } else if (routeSegment !== uriSegment) {
        // Current segments don't match, not dynamic, not splat, so no match
        // uri:   /users/123/settings
        // route: /users/:id/profile
        missed = true;
        break;
      }
    }

    if (!missed) {
      match = {
        route,
        params,
        uri: "/" + uriSegments.slice(0, index).join("/")
      };
      break;
    }
  }

  return match || default_ || null;
}

/**
 * Check if the `path` matches the `uri`.
 * @param {string} path
 * @param {string} uri
 * @return {?object}
 */
function match(route, uri) {
  return pick([route], uri);
}

/**
 * Add the query to the pathname if a query is given
 * @param {string} pathname
 * @param {string} [query]
 * @return {string}
 */
function addQuery(pathname, query) {
  return pathname + (query ? `?${query}` : "");
}

/**
 * Resolve URIs as though every path is a directory, no files. Relative URIs
 * in the browser can feel awkward because not only can you be "in a directory",
 * you can be "at a file", too. For example:
 *
 *  browserSpecResolve('foo', '/bar/') => /bar/foo
 *  browserSpecResolve('foo', '/bar') => /foo
 *
 * But on the command line of a file system, it's not as complicated. You can't
 * `cd` from a file, only directories. This way, links have to know less about
 * their current path. To go deeper you can do this:
 *
 *  <Link to="deeper"/>
 *  // instead of
 *  <Link to=`{${props.uri}/deeper}`/>
 *
 * Just like `cd`, if you want to go deeper from the command line, you do this:
 *
 *  cd deeper
 *  # not
 *  cd $(pwd)/deeper
 *
 * By treating every path as a directory, linking to relative paths should
 * require less contextual information and (fingers crossed) be more intuitive.
 * @param {string} to
 * @param {string} base
 * @return {string}
 */
function resolve(to, base) {
  // /foo/bar, /baz/qux => /foo/bar
  if (startsWith(to, "/")) {
    return to;
  }

  const [toPathname, toQuery] = to.split("?");
  const [basePathname] = base.split("?");
  const toSegments = segmentize(toPathname);
  const baseSegments = segmentize(basePathname);

  // ?a=b, /users?b=c => /users?a=b
  if (toSegments[0] === "") {
    return addQuery(basePathname, toQuery);
  }

  // profile, /users/789 => /users/789/profile
  if (!startsWith(toSegments[0], ".")) {
    const pathname = baseSegments.concat(toSegments).join("/");

    return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
  }

  // ./       , /users/123 => /users/123
  // ../      , /users/123 => /users
  // ../..    , /users/123 => /
  // ../../one, /a/b/c/d   => /a/b/one
  // .././one , /a/b/c/d   => /a/b/c/one
  const allSegments = baseSegments.concat(toSegments);
  const segments = [];

  allSegments.forEach(segment => {
    if (segment === "..") {
      segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });

  return addQuery("/" + segments.join("/"), toQuery);
}

/**
 * Combines the `basepath` and the `path` into one path.
 * @param {string} basepath
 * @param {string} path
 */
function combinePaths(basepath, path) {
  return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
}

/* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.12.1 */

const Router = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $base, $location, $routes;

	

  let { basepath = "/", url = null } = $$props;

  const locationContext = getContext(LOCATION);
  const routerContext = getContext(ROUTER);

  const routes = writable([]); $routes = get_store_value(routes);
  const activeRoute = writable(null);
  let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

  // If locationContext is not set, this is the topmost Router in the tree.
  // If the `url` prop is given we force the location to it.
  const location =
    locationContext ||
    writable(url ? { pathname: url } : globalHistory.location); $location = get_store_value(location);

  // If routerContext is set, the routerBase of the parent Router
  // will be the base for this Router's descendants.
  // If routerContext is not set, the path and resolved uri will both
  // have the value of the basepath prop.
  const base = routerContext
    ? routerContext.routerBase
    : writable({
        path: basepath,
        uri: basepath
      }); $base = get_store_value(base);

  const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    // If there is no activeRoute, the routerBase will be identical to the base.
    if (activeRoute === null) {
      return base;
    }

    const { path: basepath } = base;
    const { route, uri } = activeRoute;
    // Remove the potential /* or /*splatname from
    // the end of the child Routes relative paths.
    const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

    return { path, uri };
  });

  function registerRoute(route) {
    const { path: basepath } = $base;
    let { path } = route;

    // We store the original path in the _path property so we can reuse
    // it when the basepath changes. The only thing that matters is that
    // the route reference is intact, so mutation is fine.
    route._path = path;
    route.path = combinePaths(basepath, path);

    if (typeof window === "undefined") {
      // In SSR we should set the activeRoute immediately if it is a match.
      // If there are more Routes being registered after a match is found,
      // we just skip them.
      if (hasActiveRoute) {
        return;
      }

      const matchingRoute = match(route, $location.pathname);
      if (matchingRoute) {
        activeRoute.set(matchingRoute);
        hasActiveRoute = true;
      }
    } else {
      routes.update(rs => {
        rs.push(route);
        return rs;
      });
    }
  }

  function unregisterRoute(route) {
    routes.update(rs => {
      const index = rs.indexOf(route);
      rs.splice(index, 1);
      return rs;
    });
  }

  if (!locationContext) {
    // The topmost Router in the tree is responsible for updating
    // the location store and supplying it through context.
    onMount(() => {
      const unlisten = globalHistory.listen(history => {
        location.set(history.location);
      });

      return unlisten;
    });

    setContext(LOCATION, location);
  }

  setContext(ROUTER, {
    activeRoute,
    base,
    routerBase,
    registerRoute,
    unregisterRoute
  });

	if ($$props.basepath === void 0 && $$bindings.basepath && basepath !== void 0) $$bindings.basepath(basepath);
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);

	$base = get_store_value(base);
	$location = get_store_value(location);
	$routes = get_store_value(routes);

	{
        const { path: basepath } = $base;
        routes.update(rs => {
          rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
          return rs;
        });
      }
	{
        const bestMatch = pick($routes, $location.pathname);
        activeRoute.set(bestMatch);
      }

	return `${$$slots.default ? $$slots.default({}) : ``}`;
});

/* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.12.1 */

const Route = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $activeRoute, $location;

	

  let { path = "", component = null } = $$props;

  const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); $activeRoute = get_store_value(activeRoute);
  const location = getContext(LOCATION); $location = get_store_value(location);

  const route = {
    path,
    // If no path prop is given, this Route will act as the default Route
    // that is rendered if no other Route in the Router is a match.
    default: path === ""
  };
  let routeParams = {};
  let routeProps = {};

  registerRoute(route);

  // There is no need to unregister Routes in SSR since it will all be
  // thrown away anyway.
  if (typeof window !== "undefined") {
    onDestroy(() => {
      unregisterRoute(route);
    });
  }

	if ($$props.path === void 0 && $$bindings.path && path !== void 0) $$bindings.path(path);
	if ($$props.component === void 0 && $$bindings.component && component !== void 0) $$bindings.component(component);

	$activeRoute = get_store_value(activeRoute);
	$location = get_store_value(location);

	if ($activeRoute && $activeRoute.route === route) {
        routeParams = $activeRoute.params;
      }
	{
        const { path, component, ...rest } = $$props;
        routeProps = rest;
      }

	return `${ $activeRoute !== null && $activeRoute.route === route ? `${ component !== null ? `${validate_component(((component) || missing_component), 'svelte:component').$$render($$result, Object.assign({ location: $location }, routeParams, routeProps), {}, {})}` : `${$$slots.default ? $$slots.default({ params: routeParams, location: $location }) : ``}` }` : `` }`;
});

/* node_modules\svelte-routing\src\Link.svelte generated by Svelte v3.12.1 */

const Link = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $base, $location;

	

  let { to = "#", replace = false, state = {}, getProps = () => ({}) } = $$props;

  const { base } = getContext(ROUTER); $base = get_store_value(base);
  const location = getContext(LOCATION); $location = get_store_value(location);

  let href, isPartiallyCurrent, isCurrent, props;

	if ($$props.to === void 0 && $$bindings.to && to !== void 0) $$bindings.to(to);
	if ($$props.replace === void 0 && $$bindings.replace && replace !== void 0) $$bindings.replace(replace);
	if ($$props.state === void 0 && $$bindings.state && state !== void 0) $$bindings.state(state);
	if ($$props.getProps === void 0 && $$bindings.getProps && getProps !== void 0) $$bindings.getProps(getProps);

	$base = get_store_value(base);
	$location = get_store_value(location);

	href = to === "/" ? $base.uri : resolve(to, $base.uri);
	isPartiallyCurrent = startsWith($location.pathname, href);
	isCurrent = href === $location.pathname;
	let ariaCurrent = isCurrent ? "page" : undefined;
	props = getProps({
        location: $location,
        href,
        isPartiallyCurrent,
        isCurrent
      });

	return `<a${spread([{ href: `${escape(href)}` }, { "aria-current": `${escape(ariaCurrent)}` }, props])}>
	  ${$$slots.default ? $$slots.default({}) : ``}
	</a>`;
});

/* src\components\NavLink.svelte generated by Svelte v3.12.1 */

function getProps({ location, href, isPartiallyCurrent, isCurrent }) {
  const isActive = href === "/" ? isCurrent : isPartiallyCurrent || isCurrent;

  // The object returned here is spread on the anchor element's attributes
  if (isActive) {
    return { class: "active" };
  }
  return {};
}

const NavLink = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { to = "" } = $$props;

	if ($$props.to === void 0 && $$bindings.to && to !== void 0) $$bindings.to(to);

	return `${validate_component(Link, 'Link').$$render($$result, { to: to, getProps: getProps }, {}, {
		default: () => `
	  ${$$slots.default ? $$slots.default({}) : ``}
	`
	})}`;
});

/* src\components\Object.svelte generated by Svelte v3.12.1 */

const css = {
	code: "li.svelte-u7q1fj{position:absolute;width:14rem;display:flex;flex-direction:column;height:13em;background-color:#efefef;border-radius:0px 5% 5% 5%;transition:.5s ease}li.svelte-u7q1fj:hover{transform:scale(1.05)}li.svelte-u7q1fj:nth-of-type(1){top:68%;left:27%}li.svelte-u7q1fj:nth-of-type(2){top:42%;left:82%}li.svelte-u7q1fj:nth-of-type(3){top:30%;left:47%}li.svelte-u7q1fj:nth-of-type(4){top:39%;left:16%}li.svelte-u7q1fj:nth-of-type(5){top:72%;left:68%}img.svelte-u7q1fj{width:81%;height:7rem;margin-top:2rem}h2.svelte-u7q1fj{font-size:1rem}a.svelte-u7q1fj{text-decoration:none;color:black;text-align:center}",
	map: "{\"version\":3,\"file\":\"Object.svelte\",\"sources\":[\"Object.svelte\"],\"sourcesContent\":[\"<script>\\r\\n    export let link;\\r\\n    export let imageSource;\\r\\n    export let objectTitle;\\r\\n</script>\\r\\n<style>\\r\\n    li {\\r\\n\\t\\tposition: absolute;\\r\\n\\t\\twidth: 14rem;\\r\\n\\t\\tdisplay: flex;\\r\\n\\t\\tflex-direction: column;\\r\\n\\t\\theight: 13em;\\r\\n\\t\\tbackground-color: #efefef;\\r\\n\\t\\tborder-radius: 0px 5% 5% 5%;\\r\\n\\t\\ttransition: .5s ease;\\r\\n\\t}\\r\\n\\tli:hover {\\r\\n\\t\\ttransform: scale(1.05);\\r\\n\\r\\n\\t}\\r\\n\\tli:nth-of-type(1){\\r\\n\\t\\ttop: 68%;\\r\\n\\t\\tleft: 27%;\\r\\n\\t}\\r\\n\\tli:nth-of-type(2){\\r\\n\\t\\ttop: 42%;\\r\\n    \\tleft: 82%;\\r\\n\\t}\\r\\n\\tli:nth-of-type(3){\\r\\n\\t\\ttop: 30%;\\r\\n\\t\\tleft: 47%;\\r\\n\\t}\\r\\n\\tli:nth-of-type(4){\\r\\n\\t\\ttop: 39%;\\r\\n    \\tleft: 16%;\\r\\n\\t}\\r\\n\\tli:nth-of-type(5){\\r\\n\\t\\ttop: 72%;\\r\\n    \\tleft: 68%;\\r\\n\\t}\\r\\n    img {\\r\\n\\t\\twidth: 81%;\\r\\n    \\theight: 7rem;\\r\\n    \\tmargin-top: 2rem;\\t\\t\\r\\n\\t}\\r\\n    h2 {\\r\\n\\t\\tfont-size: 1rem;\\r\\n\\t}\\r\\n\\ta {\\r\\n\\t\\ttext-decoration: none;\\r\\n\\t\\tcolor: black;\\r\\n\\t\\ttext-align: center;\\r\\n\\t}\\r\\n</style>\\r\\n<li><a href={link}>\\r\\n\\t<img src={imageSource} alt={objectTitle}>\\r\\n\\t<h2>{objectTitle}</h2>\\r\\n</a></li>\"],\"names\":[],\"mappings\":\"AAMI,EAAE,cAAC,CAAC,AACN,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,KAAK,CACZ,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,MAAM,CAAE,IAAI,CACZ,gBAAgB,CAAE,OAAO,CACzB,aAAa,CAAE,GAAG,CAAC,EAAE,CAAC,EAAE,CAAC,EAAE,CAC3B,UAAU,CAAE,GAAG,CAAC,IAAI,AACrB,CAAC,AACD,gBAAE,MAAM,AAAC,CAAC,AACT,SAAS,CAAE,MAAM,IAAI,CAAC,AAEvB,CAAC,AACD,gBAAE,aAAa,CAAC,CAAC,CAAC,AACjB,GAAG,CAAE,GAAG,CACR,IAAI,CAAE,GAAG,AACV,CAAC,AACD,gBAAE,aAAa,CAAC,CAAC,CAAC,AACjB,GAAG,CAAE,GAAG,CACL,IAAI,CAAE,GAAG,AACb,CAAC,AACD,gBAAE,aAAa,CAAC,CAAC,CAAC,AACjB,GAAG,CAAE,GAAG,CACR,IAAI,CAAE,GAAG,AACV,CAAC,AACD,gBAAE,aAAa,CAAC,CAAC,CAAC,AACjB,GAAG,CAAE,GAAG,CACL,IAAI,CAAE,GAAG,AACb,CAAC,AACD,gBAAE,aAAa,CAAC,CAAC,CAAC,AACjB,GAAG,CAAE,GAAG,CACL,IAAI,CAAE,GAAG,AACb,CAAC,AACE,GAAG,cAAC,CAAC,AACP,EAAE,GAAG,CAAE,GAAG,CACP,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,IAAI,AACpB,CAAC,AACE,EAAE,cAAC,CAAC,AACN,SAAS,CAAE,IAAI,AAChB,CAAC,AACD,CAAC,cAAC,CAAC,AACF,eAAe,CAAE,IAAI,CACrB,KAAK,CAAE,KAAK,CACZ,UAAU,CAAE,MAAM,AACnB,CAAC\"}"
};

const Object$1 = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { link, imageSource, objectTitle } = $$props;

	if ($$props.link === void 0 && $$bindings.link && link !== void 0) $$bindings.link(link);
	if ($$props.imageSource === void 0 && $$bindings.imageSource && imageSource !== void 0) $$bindings.imageSource(imageSource);
	if ($$props.objectTitle === void 0 && $$bindings.objectTitle && objectTitle !== void 0) $$bindings.objectTitle(objectTitle);

	$$result.css.add(css);

	return `<li class="svelte-u7q1fj"><a${add_attribute("href", link, 0)} class="svelte-u7q1fj">
		<img${add_attribute("src", imageSource, 0)}${add_attribute("alt", objectTitle, 0)} class="svelte-u7q1fj">
		<h2 class="svelte-u7q1fj">${escape(objectTitle)}</h2>
	</a></li>`;
});

/* src\routes\Home.svelte generated by Svelte v3.12.1 */

const css$1 = {
	code: "ul.svelte-c9dga0{display:flex}",
	map: "{\"version\":3,\"file\":\"Home.svelte\",\"sources\":[\"Home.svelte\"],\"sourcesContent\":[\"<script>\\r\\n\\texport let data;\\r\\n\\timport Object from '../components/Object.svelte';\\r\\n</script>\\r\\n<style>\\r\\n\\tul {\\r\\n\\t\\tdisplay: flex;\\r\\n\\t}\\r\\n</style>\\r\\n<div>\\r\\n<h1>Architectuur van Indonesië</h1>\\r\\n<ul>\\r\\n\\t{#each data as source}\\r\\n\\t<Object data={data}\\r\\n\\t\\t\\tlink=\\\"details/{source.cho.value.slice(-6)}\\\" \\r\\n\\t\\t\\timageSource={source.imageModel.value} \\r\\n\\t\\t\\tobjectTitle={source.modelName.value}/>\\r\\n\\t{/each}\\r\\n</ul>\\r\\n</div>\"],\"names\":[],\"mappings\":\"AAKC,EAAE,cAAC,CAAC,AACH,OAAO,CAAE,IAAI,AACd,CAAC\"}"
};

const Home = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { data } = $$props;

	if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);

	$$result.css.add(css$1);

	return `<div>
	<h1>Architectuur van Indonesië</h1>
	<ul class="svelte-c9dga0">
		${each(data, (source) => `${validate_component(Object$1, 'Object').$$render($$result, {
		data: data,
		link: `details/${escape(source.cho.value.slice(-6))}`,
		imageSource: source.imageModel.value,
		objectTitle: source.modelName.value
	}, {}, {})}`)}
	</ul>
	</div>`;
});

/* src\components\RelatedObject.svelte generated by Svelte v3.12.1 */

const css$2 = {
	code: "li.svelte-hovb5o{position:relative;min-width:14rem;display:flex;flex-direction:column;height:13em;background-color:#efefef;border-radius:0px 5% 5% 5%;transition:.5s ease}img.svelte-hovb5o{width:81%;height:7rem;margin-top:2rem}h2.svelte-hovb5o{font-size:1rem}a.svelte-hovb5o{text-decoration:none;color:black;text-align:center}",
	map: "{\"version\":3,\"file\":\"RelatedObject.svelte\",\"sources\":[\"RelatedObject.svelte\"],\"sourcesContent\":[\"<script>\\r\\n    export let link;\\r\\n    export let imageSource;\\r\\n    export let objectTitle;\\r\\n</script>\\r\\n<style>\\r\\n    li {\\r\\n\\t\\tposition: relative;\\r\\n\\t\\tmin-width: 14rem;\\r\\n\\t\\tdisplay: flex;\\r\\n\\t\\tflex-direction: column;\\r\\n\\t\\theight: 13em;\\r\\n\\t\\tbackground-color: #efefef;\\r\\n\\t\\tborder-radius: 0px 5% 5% 5%;\\r\\n\\t\\ttransition: .5s ease;\\r\\n\\t}\\r\\n    img {\\r\\n\\t\\twidth: 81%;\\r\\n    \\theight: 7rem;\\r\\n    \\tmargin-top: 2rem;\\t\\t\\r\\n\\t}\\r\\n    h2 {\\r\\n\\t\\tfont-size: 1rem;\\r\\n\\t}\\r\\n\\ta {\\r\\n\\t\\ttext-decoration: none;\\r\\n\\t\\tcolor: black;\\r\\n\\t\\ttext-align: center;\\r\\n\\t}\\r\\n</style>\\r\\n<li><a href={link}>\\r\\n\\t<img src={imageSource} alt={objectTitle}>\\r\\n\\t<h2>{objectTitle}</h2>\\r\\n</a></li>\"],\"names\":[],\"mappings\":\"AAMI,EAAE,cAAC,CAAC,AACN,QAAQ,CAAE,QAAQ,CAClB,SAAS,CAAE,KAAK,CAChB,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,MAAM,CAAE,IAAI,CACZ,gBAAgB,CAAE,OAAO,CACzB,aAAa,CAAE,GAAG,CAAC,EAAE,CAAC,EAAE,CAAC,EAAE,CAC3B,UAAU,CAAE,GAAG,CAAC,IAAI,AACrB,CAAC,AACE,GAAG,cAAC,CAAC,AACP,KAAK,CAAE,GAAG,CACP,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,IAAI,AACpB,CAAC,AACE,EAAE,cAAC,CAAC,AACN,SAAS,CAAE,IAAI,AAChB,CAAC,AACD,CAAC,cAAC,CAAC,AACF,eAAe,CAAE,IAAI,CACrB,KAAK,CAAE,KAAK,CACZ,UAAU,CAAE,MAAM,AACnB,CAAC\"}"
};

const RelatedObject = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { link, imageSource, objectTitle } = $$props;

	if ($$props.link === void 0 && $$bindings.link && link !== void 0) $$bindings.link(link);
	if ($$props.imageSource === void 0 && $$bindings.imageSource && imageSource !== void 0) $$bindings.imageSource(imageSource);
	if ($$props.objectTitle === void 0 && $$bindings.objectTitle && objectTitle !== void 0) $$bindings.objectTitle(objectTitle);

	$$result.css.add(css$2);

	return `<li class="svelte-hovb5o"><a${add_attribute("href", link, 0)} class="svelte-hovb5o">
		<img${add_attribute("src", imageSource, 0)}${add_attribute("alt", objectTitle, 0)} class="svelte-hovb5o">
		<h2 class="svelte-hovb5o">${escape(objectTitle)}</h2>
	</a></li>`;
});

/* src\components\Related.svelte generated by Svelte v3.12.1 */

const css$3 = {
	code: "nav.svelte-4nasls{top:41rem;width:61rem;height:16rem;display:flex;position:absolute;overflow-x:scroll;margin-left:2.5rem}",
	map: "{\"version\":3,\"file\":\"Related.svelte\",\"sources\":[\"Related.svelte\"],\"sourcesContent\":[\"<script>\\r\\n    import RelatedObject from '../components/RelatedObject.svelte';\\r\\n    export let data;\\r\\n    console.log(data);\\r\\n</script>\\r\\n<style>\\r\\n    nav {\\r\\n        top: 41rem;\\r\\n        width: 61rem;\\r\\n        height: 16rem;\\r\\n        display: flex;\\r\\n        position: absolute;\\r\\n        overflow-x: scroll;\\r\\n        margin-left: 2.5rem;\\r\\n    }\\r\\n</style>\\r\\n<nav>\\r\\n    {#each data as data}\\r\\n        <RelatedObject link=\\\"details/{data.cho.value.slice(-6)}\\\" \\r\\n                imageSource={data.imageModel.value} \\r\\n                objectTitle={data.modelName.value}/>\\r\\n    {/each}\\r\\n</nav>\\r\\n\"],\"names\":[],\"mappings\":\"AAMI,GAAG,cAAC,CAAC,AACD,GAAG,CAAE,KAAK,CACV,KAAK,CAAE,KAAK,CACZ,MAAM,CAAE,KAAK,CACb,OAAO,CAAE,IAAI,CACb,QAAQ,CAAE,QAAQ,CAClB,UAAU,CAAE,MAAM,CAClB,WAAW,CAAE,MAAM,AACvB,CAAC\"}"
};

const Related = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { data } = $$props;
    console.log(data);

	if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);

	$$result.css.add(css$3);

	return `<nav class="svelte-4nasls">
	    ${each(data, (data) => `${validate_component(RelatedObject, 'RelatedObject').$$render($$result, {
		link: `details/${escape(data.cho.value.slice(-6))}`,
		imageSource: data.imageModel.value,
		objectTitle: data.modelName.value
	}, {}, {})}`)}
	</nav>`;
});

/* src\components\DetailContent.svelte generated by Svelte v3.12.1 */

const css$4 = {
	code: "img.svelte-1hrh0kg{width:40rem}section.svelte-1hrh0kg{display:flex}div.svelte-1hrh0kg{padding:2rem}",
	map: "{\"version\":3,\"file\":\"DetailContent.svelte\",\"sources\":[\"DetailContent.svelte\"],\"sourcesContent\":[\"<script>\\r\\n    export let title;\\r\\n    export let image;\\r\\n    export let placeName;\\r\\n    export let date;\\r\\n    export let description;\\r\\n</script>\\r\\n<style>\\r\\n    img {\\r\\n\\t\\twidth: 40rem;\\r\\n\\t}\\r\\n\\tsection {\\r\\n\\t\\tdisplay: flex;\\r\\n    }\\r\\n    div {\\r\\n\\t\\tpadding: 2rem;\\r\\n\\t}\\r\\n</style>\\r\\n<h1>{title}</h1>\\r\\n<section>\\r\\n    <img src={image} alt=\\\"{title}\\\">\\r\\n    <div>\\r\\n        <h2>Herkomst:</h2>\\r\\n        <p>{placeName}</p>\\r\\n        <h2>Datum:</h2>\\r\\n        <p>{description}</p>\\r\\n        <p>Model van een Minangkabau woning met uitbreiding. In een Minangkabau familiewoning wonen meerdere gezinnen, alle afstammelingen van dezelfde grootmoeder. Het huis is verdeeld in evenveel afdelingen (ruangs) als er gezinnen wonen. Wordt een Minangkabau huis te klein dan kunnen aan weerszijden stukken worden bijgebouwd, waarvan het dak evenals dat van het oorspronkelijke gedeelte in spits toelopende punten (tanduk) eindigt. Het onderhavige model heeft vier punten. Er bestaan woningen van twee, vier, zes of acht punten.</p>\\r\\n    </div>\\r\\n</section>\"],\"names\":[],\"mappings\":\"AAQI,GAAG,eAAC,CAAC,AACP,KAAK,CAAE,KAAK,AACb,CAAC,AACD,OAAO,eAAC,CAAC,AACR,OAAO,CAAE,IAAI,AACX,CAAC,AACD,GAAG,eAAC,CAAC,AACP,OAAO,CAAE,IAAI,AACd,CAAC\"}"
};

const DetailContent = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { title, image, placeName, date, description } = $$props;

	if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
	if ($$props.image === void 0 && $$bindings.image && image !== void 0) $$bindings.image(image);
	if ($$props.placeName === void 0 && $$bindings.placeName && placeName !== void 0) $$bindings.placeName(placeName);
	if ($$props.date === void 0 && $$bindings.date && date !== void 0) $$bindings.date(date);
	if ($$props.description === void 0 && $$bindings.description && description !== void 0) $$bindings.description(description);

	$$result.css.add(css$4);

	return `<h1>${escape(title)}</h1>
	<section class="svelte-1hrh0kg">
	    <img${add_attribute("src", image, 0)}${add_attribute("alt", title, 0)} class="svelte-1hrh0kg">
	    <div class="svelte-1hrh0kg">
	        <h2>Herkomst:</h2>
	        <p>${escape(placeName)}</p>
	        <h2>Datum:</h2>
	        <p>${escape(description)}</p>
	        <p>Model van een Minangkabau woning met uitbreiding. In een Minangkabau familiewoning wonen meerdere gezinnen, alle afstammelingen van dezelfde grootmoeder. Het huis is verdeeld in evenveel afdelingen (ruangs) als er gezinnen wonen. Wordt een Minangkabau huis te klein dan kunnen aan weerszijden stukken worden bijgebouwd, waarvan het dak evenals dat van het oorspronkelijke gedeelte in spits toelopende punten (tanduk) eindigt. Het onderhavige model heeft vier punten. Er bestaan woningen van twee, vier, zes of acht punten.</p>
	    </div>
	</section>`;
});

/* src\routes\Detail.svelte generated by Svelte v3.12.1 */

const css$5 = {
	code: ".svelte-1nwxagt{transition:.5s ease}#gradient.svelte-1nwxagt{width:100%;height:100%;position:absolute;top:0;left:0;background:linear-gradient(to left, transparent 0%, #efefef 31% );padding:0}main.svelte-1nwxagt{position:absolute;background-color:#efefef;width:66%;left:0;top:0;padding:1rem;padding-left:3rem}",
	map: "{\"version\":3,\"file\":\"Detail.svelte\",\"sources\":[\"Detail.svelte\"],\"sourcesContent\":[\"<script>\\t\\r\\n\\texport let data;\\r\\n\\timport Related from '../components/Related.svelte';\\r\\n\\timport DetailContent from '../components/DetailContent.svelte';\\r\\n\\tconst queryUrl =\\\"https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql\\\"\\r\\n\\tlet detailURI = window.location.pathname.slice(-6); //slice the unique part from the URL to use for a second query to fetch detail page data.\\r\\n\\tlet detailQuery = ``;\\r\\n\\tlet detailData = [];\\r\\n\\t\\r\\n\\tfunction formulateQuery(detailURI) {\\r\\n\\t\\tdetailQuery = `\\r\\n\\t\\tPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\\r\\n\\t\\tPREFIX dc: <http://purl.org/dc/elements/1.1/>\\r\\n\\t\\tPREFIX dct: <http://purl.org/dc/terms/>\\r\\n\\t\\tPREFIX skos: <http://www.w3.org/2004/02/skos/core#>\\r\\n\\t\\tPREFIX edm: <http://www.europeana.eu/schemas/edm/>\\r\\n\\t\\tPREFIX foaf: <http://xmlns.com/foaf/0.1/>\\r\\n\\t\\tSELECT ?cho ?modelName ?placeName ?imageModel ?date ?modelMaterial ?modelRelated ?description WHERE {\\r\\n\\t\\t\\t<https://hdl.handle.net/20.500.11840/` + detailURI + `> dc:title ?modelName ;\\r\\n\\t\\t   \\t\\tdct:medium ?material ;\\r\\n\\t\\t   \\t\\tdct:created ?date ;\\r\\n\\t\\t\\t\\tdc:type ?type ;\\r\\n\\t\\t\\t\\tdct:spatial ?place ;\\r\\n\\t\\t\\t\\tedm:isRelatedTo ?related ;\\r\\n\\t\\t\\t\\tedm:isShownBy ?imageModel .\\r\\n\\t\\t\\t\\t?material skos:prefLabel ?modelMaterial . \\r\\n\\t\\t\\t\\t?place skos:prefLabel ?placeName .\\r\\n\\t\\t\\t\\t?related skos:prefLabel ?modelRelated .\\r\\n\\t\\t} LIMIT 1\\r\\n\\t\\t`\\r\\n\\t}\\r\\n\\tasync function runDetailQuery(queryUrl, detailQuery){\\r\\n\\r\\n\\t\\tawait fetch(queryUrl+\\\"?query=\\\"+ encodeURIComponent(detailQuery) +\\\"&format=json\\\")\\r\\n\\t\\t.then(res => res.json())\\r\\n\\t\\t.then(json => {\\r\\n\\t\\t\\tdetailData = json.results.bindings\\r\\n\\t\\t\\tconsole.log(detailData[0]);\\r\\n\\t\\t})\\r\\n\\t}\\r\\n\\tformulateQuery(detailURI); //put the unique part of the URI of the selected object in a SPARQL query.\\r\\n\\trunDetailQuery(queryUrl, detailQuery); //use the new query to fetch the data for the detail page\\r\\n\\t\\t\\t\\r\\n</script>\\r\\n<style>\\r\\n\\t* {\\r\\n\\t\\ttransition: .5s ease;\\r\\n\\t}\\r\\n\\t#gradient {\\r\\n\\t\\twidth: 100%;\\r\\n\\t\\theight: 100%;\\r\\n\\t\\tposition: absolute;\\r\\n\\t\\ttop: 0;\\r\\n\\t\\tleft: 0;\\r\\n\\t\\tbackground: linear-gradient(to left, transparent 0%, #efefef 31% );\\r\\n\\t\\tpadding: 0;\\r\\n\\t}\\r\\n\\tmain {\\r\\n\\t\\tposition: absolute;\\r\\n\\t\\tbackground-color: #efefef;\\r\\n\\t\\twidth: 66%;\\r\\n\\t\\tleft: 0;\\r\\n\\t\\ttop: 0;\\r\\n\\t\\tpadding: 1rem;\\r\\n\\t\\tpadding-left: 3rem;\\r\\n\\t}\\r\\n\\t\\r\\n</style>\\r\\n{#if detailData.length == 1}\\r\\n<div id=\\\"gradient\\\">\\r\\n</div>\\r\\n<main>\\r\\n<DetailContent title={detailData[0].modelName.value} image={detailData[0].imageModel.value} placeName={detailData[0].placeName.value} date={detailData[0].date.value} description=\\\"Model van een Minangkabau woning met uitbreiding. In een Minangkabau familiewoning wonen meerdere gezinnen, alle afstammelingen van dezelfde grootmoeder. Het huis is verdeeld in evenveel afdelingen (ruangs) als er gezinnen wonen. Wordt een Minangkabau huis te klein dan kunnen aan weerszijden stukken worden bijgebouwd, waarvan het dak evenals dat van het oorspronkelijke gedeelte in spits toelopende punten (tanduk) eindigt. Het onderhavige model heeft vier punten. Er bestaan woningen van twee, vier, zes of acht punten.\\\" />\\r\\n</main>\\r\\n<Related data={data}/>\\r\\n{/if}\"],\"names\":[],\"mappings\":\"AA6CC,eAAE,CAAC,AACF,UAAU,CAAE,GAAG,CAAC,IAAI,AACrB,CAAC,AACD,SAAS,eAAC,CAAC,AACV,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,CAAC,CACP,UAAU,CAAE,gBAAgB,EAAE,CAAC,IAAI,CAAC,CAAC,WAAW,CAAC,EAAE,CAAC,CAAC,OAAO,CAAC,GAAG,EAAE,CAClE,OAAO,CAAE,CAAC,AACX,CAAC,AACD,IAAI,eAAC,CAAC,AACL,QAAQ,CAAE,QAAQ,CAClB,gBAAgB,CAAE,OAAO,CACzB,KAAK,CAAE,GAAG,CACV,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,OAAO,CAAE,IAAI,CACb,YAAY,CAAE,IAAI,AACnB,CAAC\"}"
};

const queryUrl ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql";

const Detail = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { data } = $$props;
	let detailURI = window.location.pathname.slice(-6); //slice the unique part from the URL to use for a second query to fetch detail page data.
	let detailQuery = ``;
	let detailData = [];
	
	function formulateQuery(detailURI) {
		detailQuery = `
		PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
		PREFIX dc: <http://purl.org/dc/elements/1.1/>
		PREFIX dct: <http://purl.org/dc/terms/>
		PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
		PREFIX edm: <http://www.europeana.eu/schemas/edm/>
		PREFIX foaf: <http://xmlns.com/foaf/0.1/>
		SELECT ?cho ?modelName ?placeName ?imageModel ?date ?modelMaterial ?modelRelated ?description WHERE {
			<https://hdl.handle.net/20.500.11840/` + detailURI + `> dc:title ?modelName ;
		   		dct:medium ?material ;
		   		dct:created ?date ;
				dc:type ?type ;
				dct:spatial ?place ;
				edm:isRelatedTo ?related ;
				edm:isShownBy ?imageModel .
				?material skos:prefLabel ?modelMaterial . 
				?place skos:prefLabel ?placeName .
				?related skos:prefLabel ?modelRelated .
		} LIMIT 1
		`;
	}
	async function runDetailQuery(queryUrl, detailQuery){

		await fetch(queryUrl+"?query="+ encodeURIComponent(detailQuery) +"&format=json")
		.then(res => res.json())
		.then(json => {
			detailData = json.results.bindings;
			console.log(detailData[0]);
		});
	}
	formulateQuery(detailURI); //put the unique part of the URI of the selected object in a SPARQL query.
	runDetailQuery(queryUrl, detailQuery); //use the new query to fetch the data for the detail page

	if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);

	$$result.css.add(css$5);

	return `${ detailData.length == 1 ? `<div id="gradient" class="svelte-1nwxagt">
	</div>
	<main class="svelte-1nwxagt">
	${validate_component(DetailContent, 'DetailContent').$$render($$result, {
		title: detailData[0].modelName.value,
		image: detailData[0].imageModel.value,
		placeName: detailData[0].placeName.value,
		date: detailData[0].date.value,
		description: "Model van een Minangkabau woning met uitbreiding. In een Minangkabau familiewoning wonen meerdere gezinnen, alle afstammelingen van dezelfde grootmoeder. Het huis is verdeeld in evenveel afdelingen (ruangs) als er gezinnen wonen. Wordt een Minangkabau huis te klein dan kunnen aan weerszijden stukken worden bijgebouwd, waarvan het dak evenals dat van het oorspronkelijke gedeelte in spits toelopende punten (tanduk) eindigt. Het onderhavige model heeft vier punten. Er bestaan woningen van twee, vier, zes of acht punten."
	}, {}, {})}
	</main>
	${validate_component(Related, 'Related').$$render($$result, { data: data }, {}, {})}` : `` }`;
});

/* src\App.svelte generated by Svelte v3.12.1 */

const queryUrl$1 ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql";

const App = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { url = "" } = $$props;
	const query = `
	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
	PREFIX dc: <http://purl.org/dc/elements/1.1/>
	PREFIX dct: <http://purl.org/dc/terms/>
	PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
	PREFIX edm: <http://www.europeana.eu/schemas/edm/>
	PREFIX foaf: <http://xmlns.com/foaf/0.1/>
	SELECT DISTINCT ?cho ?modelName ?placeName ?imageModel WHERE {
	   <https://hdl.handle.net/20.500.11840/termmaster7745> skos:narrower* ?place .
	   ?place skos:prefLabel ?placeName .
	   VALUES ?type {"huismodel" "Huismodel"} .
	   ?cho dc:title ?modelName ;
	        dc:type ?type ;
	        dct:spatial ?place ;
	        edm:isShownBy ?imageModel .
	} ORDER BY ?cho LIMIT 5
	`;
	
	let data = []; // Declare an empty array to put the fetched data into.

	function runQuery(queryUrl, query){
	  fetch(queryUrl+"?query="+ encodeURIComponent(query) +"&format=json")
	  .then(res => res.json())
	  .then(json => {
		  data = json.results.bindings;

	  });
	}
	onMount(() => {
		runQuery(queryUrl$1, query);
	});

	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);

	return `${validate_component(Router, 'Router').$$render($$result, { url: url }, {}, {
		default: () => `
	  <nav>
	    ${validate_component(NavLink, 'NavLink').$$render($$result, { to: "/" }, {}, { default: () => `Home` })}
	  </nav>
	  <div>
	    ${validate_component(Route, 'Route').$$render($$result, {
		path: "/",
		component: Home,
		data: data
	}, {}, {})}
		${validate_component(Route, 'Route').$$render($$result, {
		path: "/details/*",
		component: Detail,
		data: data
	}, {}, {})}
	  </div>
	`
	})}`;
});

module.exports = App;
