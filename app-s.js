var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
      const child_ctx = ctx.slice();
      child_ctx[9] = list[i];
      child_ctx[10] = list;
      child_ctx[11] = i;
      return child_ctx;
    }

    // (45:4) {#each todos as todo, i (todo) }
    function create_each_block(key_1, ctx) {
      let li;
      let input;
      let t0;
      let span;
      let t1_value = /*todo*/ ctx[9].name + "";
      let t1;
      let t2;
      let a;
      let t4;
      let mounted;
      let dispose;

      function input_change_handler() {
        /*input_change_handler*/ ctx[5].call(input, /*each_value*/ ctx[10], /*i*/ ctx[11]);
      }

      function click_handler_1(...args) {
        return /*click_handler_1*/ ctx[6](/*todo*/ ctx[9], ...args);
      }

      function click_handler_2(...args) {
        return /*click_handler_2*/ ctx[7](/*todo*/ ctx[9], /*i*/ ctx[11], ...args);
      }

      const block = {
        key: key_1,
        first: null,
        c: function create() {
          li = element("li");
          input = element("input");
          t0 = space();
          span = element("span");
          t1 = text(t1_value);
          t2 = space();
          a = element("a");
          a.textContent = "[x]";
          t4 = space();
          attr_dev(input, "type", "checkbox");
          add_location(input, file, 46, 8, 1064);
          set_style(span, "cursor", "pointer");
          attr_dev(span, "class", "svelte-1mmqod7");
          toggle_class(span, "inactive", /*todo*/ ctx[9].done);
          add_location(span, file, 47, 8, 1123);
          attr_dev(a, "href", "");
          add_location(a, file, 48, 8, 1238);
          add_location(li, file, 45, 4, 1051);
          this.first = li;
        },
        m: function mount(target, anchor) {
          insert_dev(target, li, anchor);
          append_dev(li, input);
          input.checked = /*todo*/ ctx[9].done;
          append_dev(li, t0);
          append_dev(li, span);
          append_dev(span, t1);
          append_dev(li, t2);
          append_dev(li, a);
          append_dev(li, t4);

          if (!mounted) {
            dispose = [
              listen_dev(input, "change", input_change_handler),
              listen_dev(span, "click", click_handler_1, false, false, false),
              listen_dev(a, "click", prevent_default(click_handler_2), false, true, false)
            ];

            mounted = true;
          }
        },
        p: function update(new_ctx, dirty) {
          ctx = new_ctx;

          if (dirty & /*todos*/ 1) {
            input.checked = /*todo*/ ctx[9].done;
          }

          if (dirty & /*todos*/ 1 && t1_value !== (t1_value = /*todo*/ ctx[9].name + "")) set_data_dev(t1, t1_value);

          if (dirty & /*todos*/ 1) {
            toggle_class(span, "inactive", /*todo*/ ctx[9].done);
          }
        },
        d: function destroy(detaching) {
          if (detaching) detach_dev(li);
          mounted = false;
          run_all(dispose);
        }
      };

      dispatch_dev("SvelteRegisterBlock", {
        block,
        id: create_each_block.name,
        type: "each",
        source: "(45:4) {#each todos as todo, i (todo) }",
        ctx
      });

      return block;
    }

    function create_fragment(ctx) {
      let button;
      let t1;
      let t2;
      let t3;
      let ul;
      let each_blocks = [];
      let each_1_lookup = new Map();
      let mounted;
      let dispose;
      let each_value = /*todos*/ ctx[0];
      validate_each_argument(each_value);
      const get_key = ctx => /*todo*/ ctx[9];
      validate_each_keys(ctx, each_value, get_each_context, get_key);

      for (let i = 0; i < each_value.length; i += 1) {
        let child_ctx = get_each_context(ctx, each_value, i);
        let key = get_key(child_ctx);
        each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
      }

      const block = {
        c: function create() {
          button = element("button");
          button.textContent = "Test";
          t1 = text("\n[ ");
          t2 = text(/*duration*/ ctx[1]);
          t3 = text(" ]\n\n");
          ul = element("ul");

          for (let i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].c();
          }

          add_location(button, file, 40, 0, 943);
          add_location(ul, file, 43, 0, 1005);
        },
        l: function claim(nodes) {
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert_dev(target, button, anchor);
          insert_dev(target, t1, anchor);
          insert_dev(target, t2, anchor);
          insert_dev(target, t3, anchor);
          insert_dev(target, ul, anchor);

          for (let i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].m(ul, null);
          }

          if (!mounted) {
            dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
            mounted = true;
          }
        },
        p: function update(ctx, [dirty]) {
          if (dirty & /*duration*/ 2) set_data_dev(t2, /*duration*/ ctx[1]);

          if (dirty & /*remove, todos, select*/ 9) {
            const each_value = /*todos*/ ctx[0];
            validate_each_argument(each_value);
            validate_each_keys(ctx, each_value, get_each_context, get_key);
            each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);
          }
        },
        i: noop,
        o: noop,
        d: function destroy(detaching) {
          if (detaching) detach_dev(button);
          if (detaching) detach_dev(t1);
          if (detaching) detach_dev(t2);
          if (detaching) detach_dev(t3);
          if (detaching) detach_dev(ul);

          for (let i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].d();
          }

          mounted = false;
          dispose();
        }
      };

      dispatch_dev("SvelteRegisterBlock", {
        block,
        id: create_fragment.name,
        type: "component",
        source: "",
        ctx
      });

      return block;
    }

    function select(todo) {
      console.log(todo);
    }

    function instance($$self, $$props, $$invalidate) {
      let todos = [];
      let duration = "";

      function timeit(fn) {
        let start = performance.now();
        fn();
        let end = performance.now();
        let diff = end - start;

        setTimeout(
          () => {
            $$invalidate(1, duration += " + " + diff.toFixed(2) + "ms ");
          },
          10
        );
      }

      

      function test() {
        timeit(() => {
          $$invalidate(0, todos.length = 0, todos);

          for (let i = 0; i < 5000; i++) {
            todos.push({ name: "" + i, done: false });
          }

          $$invalidate(0, todos);
        });
      }

      function remove(todo, i) {
        timeit(() => {
          todos.splice(todos.indexOf(todo), 1);

          $$invalidate(0, todos);
        });
      }

      const writable_props = [];

      Object.keys($$props).forEach(key => {
        if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
      });

      let { $$slots = {}, $$scope } = $$props;
      validate_slots("App", $$slots, []);
      const click_handler = () => test();

      function input_change_handler(each_value, i) {
        each_value[i].done = this.checked;
        $$invalidate(0, todos);
      }

      const click_handler_1 = todo => select(todo);
      const click_handler_2 = (todo, i) => remove(todo);

      $$self.$capture_state = () => ({
        todos,
        duration,
        timeit,
        test,
        remove,
        select
      });

      $$self.$inject_state = $$props => {
        if ("todos" in $$props) $$invalidate(0, todos = $$props.todos);
        if ("duration" in $$props) $$invalidate(1, duration = $$props.duration);
      };

      if ($$props && "$$inject" in $$props) {
        $$self.$inject_state($$props.$$inject);
      }

      return [
        todos,
        duration,
        test,
        remove,
        click_handler,
        input_change_handler,
        click_handler_1,
        click_handler_2
      ];
    }

    class App extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance, create_fragment, safe_not_equal, {});

        dispatch_dev("SvelteRegisterComponent", {
          component: this,
          tagName: "App",
          options,
          id: create_fragment.name
        });
      }
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'world'
      }
    });

    return app;

}());
