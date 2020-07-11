(function () {
    'use strict';

    function $$htmlToFragment(html) {
        let t = document.createElement('template');
        t.innerHTML = html;
        return t.content;
    }
    function $$removeItem(array, item) {
        let i = array.indexOf(item);
        if (i >= 0) array.splice(i, 1);
    }
    const $$childNodes = 'childNodes';

    function $watch(cd, fn, callback, w) {
        if (!w) w = {};
        w.fn = fn;
        w.cb = callback;
        w.value = void 0;
        cd.watchers.push(w);
        return w;
    }
    function $watchReadOnly(cd, fn, callback) {
        return $watch(cd, fn, callback, { ro: true });
    }
    function $ChangeDetector(root) {
        if (root) this.root = root;else {
            this.root = this;
            this.onceList = [];
        }
        this.root = root || this;
        this.children = [];
        this.watchers = [];
        this.destroyList = [];
    }
    Object.assign($ChangeDetector.prototype, {
        new: function () {
            var cd = new $ChangeDetector(this);
            this.children.push(cd);
            return cd;
        },
        ev: function (el, event, callback) {
            el.addEventListener(event, callback);
            this.d(() => {
                el.removeEventListener(event, callback);
            });
        },
        d: function (fn) {
            this.destroyList.push(fn);
        },
        destroy: function () {
            this.watchers.length = 0;
            this.destroyList.forEach(fn => {
                try {
                    fn();
                } catch (e) {
                    console.error(e);
                }
            });
            this.destroyList.length = 0;
            this.children.forEach(cd => {
                cd.destroy();
            });
            this.children.length = 0;
        },
        once: function (fn) {
            this.root.onceList.push(fn);
        }
    });

    const compareArray = (a, b) => {
        let a0 = Array.isArray(a);
        let a1 = Array.isArray(b);
        if (a0 !== a1) return true;
        if (!a0) return a !== b;
        if (a.length !== b.length) return true;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return true;
        }
        return false;
    };

    function $$compareArray(w, value) {
        if (!compareArray(w.value, value)) return 0;
        if (Array.isArray(value)) w.value = value.slice();else w.value = value;
        w.cb(w.value);
        return w.ro ? 0 : 1;
    }
    function $digest($cd, onFinishLoop) {
        let loop = 10;
        let w;
        while (loop >= 0) {
            let changes = 0;
            let index = 0;
            let queue = [];
            let i,
                value,
                cd = $cd;
            while (cd) {
                for (i = 0; i < cd.watchers.length; i++) {
                    w = cd.watchers[i];
                    value = w.fn();
                    if (w.value !== value) {
                        if (w.cmp) {
                            changes += w.cmp(w, value);
                        } else {
                            w.value = value;
                            if (!w.ro) changes++;
                            w.cb(w.value);
                        }
                    }
                }if (cd.children.length) queue.push.apply(queue, cd.children);
                cd = queue[index++];
            }
            loop--;
            if (!changes) break;
        }
        onFinishLoop();
        let once = $cd.onceList;
        $cd.onceList = [];
        once.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error(e);
            }
        });
        if (loop < 0) console.error('Infinity changes: ', w);
    }

    function App($element, $option) {
        if ($option == null) $option = {};
        let todos = [];
        let duration = '';
        function timeit(fn) {
            $$apply();
            let start = performance.now();
            fn();
            let end = performance.now();
            let diff = end - start;
            setTimeout(() => {
                $$apply();
                duration += ' + ' + diff.toFixed(2) + 'ms ';
            }, 10);
        }
        function test() {
            $$apply();
            timeit(() => {
                $$apply();
                todos.length = 0;
                for (let i = 0; i < 5000; i++) {
                    todos.push({
                        name: '' + i,
                        done: false
                    });
                }
            });
        }
        function remove(todo) {
            $$apply();
            timeit(() => {
                $$apply();
                todos.splice(todos.indexOf(todo), 1);
            });
        }
        function select(todo) {
            $$apply();
            console.log(todo);
        }

        function $$apply() {
            if ($$apply._p) return;
            if ($$apply.planned) return;
            $$apply.planned = true;
            setTimeout(() => {
                $$apply.planned = false;
                $$apply.go();
            }, 1);
        }return function () {
            let $cd = new $ChangeDetector();

            let $component = {};
            $component.destroy = () => {
                $cd.destroy();
            };

            $$apply.go = () => {
                $$apply._p = true;
                try {
                    $digest($cd, () => $$apply._p = false);
                } finally {
                    $$apply._p = false;
                }
            };
            function $$build8($cd, $parentElement) {
                let el0 = $parentElement[$$childNodes][1];
                let el1 = $parentElement[$$childNodes][2];
                let el2 = $parentElement[$$childNodes][3][$$childNodes][1];{
                    let $element = el0;
                    $cd.ev($element, "click", $event => {
                        $$apply();test();
                    });
                }
                {
                    let $element = el1;
                    $watchReadOnly($cd, () => `
[ ` + duration + ` ]

`, value => {
                        $element.textContent = value;
                    });
                }

                function eachBlock0($cd, top) {

                    function bind($ctx, $template, todo, $index) {
                        function $$build7($cd, $parentElement) {
                            let el3 = $parentElement[$$childNodes][0][$$childNodes][1];
                            let el4 = $parentElement[$$childNodes][0][$$childNodes][3];
                            let el5 = $parentElement[$$childNodes][0][$$childNodes][3][$$childNodes][0];
                            let el6 = $parentElement[$$childNodes][0][$$childNodes][5];{
                                let $element = el3;
                                $cd.ev($element, 'input', () => {
                                    todo.done = $element.checked;$$apply();
                                });
                                $watchReadOnly($cd, () => !!todo.done, value => {
                                    if (value != $element.checked) $element.checked = value;
                                });
                            }
                            {
                                let $element = el4;
                                $cd.ev($element, "click", $event => {
                                    $$apply();select(todo);
                                });
                            }
                            {
                                let $element = el4;
                                $watchReadOnly($cd, () => !!todo.done, value => {
                                    if (value) $element.classList.add("inactive");else $element.classList.remove("inactive");
                                });
                            }
                            {
                                let $element = el5;
                                $watchReadOnly($cd, () => todo.name, value => {
                                    $element.textContent = value;
                                });
                            }
                            {
                                let $element = el6;
                                $cd.ev($element, "click", $event => {
                                    $event.preventDefault();$$apply();remove(todo);
                                });
                            }
                        }$$build7($ctx.cd, $template);
                        $ctx.reindex = function (i) {};
                    }
                    let parentNode = top.parentNode;
                    let itemTemplate = $$htmlToFragment(`<li>
        <input type="checkbox"/>
        <span style="cursor: pointer;"> </span>
        <a href>[x]</a>
    </li>`);

                    let mapping = new Map();
                    $watch($cd, () => todos, array => {
                        if (!array || !Array.isArray(array)) array = [];
                        let prevNode = top;
                        let newMapping = new Map();

                        if (mapping.size) {
                            let arrayAsSet = new Set();
                            for (let i = 0; i < array.length; i++) {
                                arrayAsSet.add(array[i]);
                            }
                            mapping.forEach((ctx, item) => {
                                if (arrayAsSet.has(item)) return;
                                let el = ctx.first;
                                while (el) {
                                    let next = el.nextSibling;
                                    el.remove();
                                    if (el == ctx.last) break;
                                    el = next;
                                }
                                ctx.cd.destroy();
                                $$removeItem($cd.children, ctx.cd);
                            });
                            arrayAsSet.clear();
                        }

                        let i, item, next_ctx, ctx;
                        for (i = 0; i < array.length; i++) {
                            item = array[i];
                            if (next_ctx) {
                                ctx = next_ctx;
                                next_ctx = null;
                            } else ctx = mapping.get(item);
                            if (ctx) {
                                if (prevNode.nextSibling != ctx.first) {
                                    let insert = true;

                                    if (i + 1 < array.length && prevNode.nextSibling) {
                                        next_ctx = mapping.get(array[i + 1]);
                                        if (prevNode.nextSibling.nextSibling === next_ctx.first) {
                                            parentNode.replaceChild(ctx.first, prevNode.nextSibling);
                                            insert = false;
                                        }
                                    }

                                    if (insert) {
                                        let insertBefore = prevNode.nextSibling;
                                        let next,
                                            el = ctx.first;
                                        while (el) {
                                            next = el.nextSibling;
                                            parentNode.insertBefore(el, insertBefore);
                                            if (el == ctx.last) break;
                                            el = next;
                                        }
                                    }
                                }
                                ctx.reindex(i);
                            } else {
                                let tpl = itemTemplate.cloneNode(true);
                                let childCD = $cd.new();
                                ctx = { cd: childCD };
                                bind(ctx, tpl, item);
                                ctx.first = tpl.firstChild;
                                ctx.last = tpl.lastChild;
                                parentNode.insertBefore(tpl, prevNode.nextSibling);
                            }
                            prevNode = ctx.last;
                            newMapping.set(item, ctx);
                        }mapping.clear();
                        mapping = newMapping;
                    }, { cmp: $$compareArray });
                }
                eachBlock0($cd, el2);
            }const rootTemplate = `

<button>Test</button> <ul>
    <!-- #each todos as todo  -->
</ul>
`;
            if ($option.afterElement) {
                let tag = $element;
                $element = $$htmlToFragment(rootTemplate);
                $$build8($cd, $element);
                tag.parentNode.insertBefore($element, tag.nextSibling);
            } else {
                $element.innerHTML = rootTemplate;
                $$build8($cd, $element);
            }

            $$apply();
            return $component;
        }();
    }

    App(document.body);
})();
