var COOKIE = "";
var source = null;
var READY = false;
var storage = {};
var localStorageSandboxed;

function setupSandbox() {
    Object.defineProperty(document, "cookie", {
        get: function () {
            return COOKIE;
        },

        set: function (value) {
            if (value && value.length > 100) {
                COOKIE = value;
                source && source.window.postMessage("set:" + COOKIE, "*");
            }
        },
    });
    localStorageSandboxed = {
        getItem: function (item) {
            return storage[item];
        },

        setItem: function (item, value) {
            storage[item] = value;
            source &&
            source.window.postMessage("setLocal:" + JSON.stringify(storage), "*");
        },
    };

    window.localStorage = window.localStorageSandboxed;

    window.addEventListener("message", async function (event) {
        if (!event.data) return;
        if (!event.data.indexOf("cookies:")) {
            COOKIE = (event.data + "").substring("cookies:".length);
            source = event.source;
        }
        if (!event.data.indexOf("local:")) {
            const storageStr = (event.data + "").substring("local:".length);
            source = event.source;
            if (storageStr) {
                const json = JSON.parse(storageStr);
                if (typeof json === "object") {
                    storage = json;
                }
            }
        }
        READY = true;
    });
}


function setupParent() {
    const sandbox = document.getElementsByTagName("iframe")[0];
    const reportChild = () => {
        chrome.storage.local.get(["cookies", "local"], (e) => {
            const c = e.cookies ? e.cookies : "";
            sandbox.contentWindow.postMessage("cookies:" + c, "*");
            const l = e.local ? e.local : "";
            sandbox.contentWindow.postMessage("local:" + l, "*");
        });
    };
    window.addEventListener("message", async function (event) {
        if (!event.data) return;
        if (!event.data.indexOf("set:")) {
            COOKIE = (event.data + "").substring("set:".length);
            chrome.storage.local.set({cookies: COOKIE});
        }
        if (!event.data.indexOf("setLocal:")) {
            const storageStr = (event.data + "").substring("setLocal:".length);
            chrome.storage.local.set({local: storageStr});
        }
    });
    setInterval(reportChild, 1e3);
    reportChild();
}

if (typeof window.chrome.storage === "undefined") setupSandbox();
else setupParent();