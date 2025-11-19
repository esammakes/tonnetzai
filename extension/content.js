// after the extension is clicked and it's a Youtube watch page = valid
// we'll make the service-worker.js trigger content.js here
// we'll also use Shadow DOM styles ??

// content.js will wait for toggle message from service-worker
// if on watch page --> create panel; if already there, remote it
// watces for Youtube's client-side navigations
//if panel is "open" it reattaches itself on new Watch pages

(() => {
  const HOST_ID = "tonnetz-root-host";
  let isOpen = false; // our curr toggle state

  // helper: are we on a watch page?
  function onWatchPage() {
    return location.pathname === "/watch";
  }

  // creating Shadow DOM host + panel if missing
  function ensurePanel() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.style.position = "fixed";
      host.style.top = "72px";
      host.style.right = "16px";
      host.style.zIndex = "2147483647";
      host.style.width = "420px";
      host.style.height = "300px";
      host.style.pointerEvents = "auto";
      document.documentElement.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });

      // external css (or keep styles inline)
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("panel.css");
      shadow.appendChild(link);

      // panel content
      const panel = document.createElement("div");
      panel.setAttribute("data-tonnetz", "panel");
      panel.style.fontFamily = "Inter, system-ui, sans-serif";
      panel.style.background = "rgba(18,18,18,.96)";
      panel.style.color = "#fff";
      panel.style.borderRadius = "14px";
      panel.style.boxShadow = "0 8px 24px rgba(0,0,0,.28)";
      panel.style.border = "1px solid rgba(255,255,255,.1)";
      panel.style.overflow = "hidden";
      panel.style.height = "100%";
      panel.style.display = "flex";
      panel.style.flexDirection = "column";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "8px";
      header.style.padding = "8px 12px";
      header.style.borderBottom = "1px solid rgba(255,255,255,.08)";
      header.innerHTML = `
        <strong style="flex:1">Tonnetz</strong>
        <button id="tnz-close" style="background:transparent;border:0;color:white;cursor:pointer;font-size:16px;">×</button>
      `;

      const body = document.createElement("div");
      body.style.padding = "12px";
      body.style.flex = "1";
      body.innerHTML = `
        <div style="opacity:.7;font-size:12px;margin-bottom:8px">Status</div>
        <div id="tnz-status" style="font-size:14px;word-break:break-all;"></div>
        <div style="margin-top:12px;height:140px;background:rgba(255,255,255,.04);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <div style="opacity:.7">Your visualization goes here</div>
        </div>
      `;

      panel.appendChild(header);
      panel.appendChild(body);
      shadow.appendChild(panel);

      // close button
      shadow.getElementById("tnz-close").addEventListener("click", () => {
        removePanel();
        isOpen = false;
      });
    }

    // Update dynamic info each time we attach
    const vid = new URL(location.href).searchParams.get("v");
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    const status = shadow?.getElementById("tnz-status");
    if (status) {
      status.textContent = onWatchPage()
        ? vid
          ? `On Watch page. Video ID: ${vid}`
          : "On Watch page. No video ID found."
        : "Not on a Watch page.";
    }
  }

  function removePanel() {
    const host = document.getElementById(HOST_ID);
    if (host) host.remove();
  }

  function togglePanel() {
    //only show the panel on /watch. If not, we can either no-op or show a toast.
    if (!onWatchPage()) {
      // console.log("Tonnetz: open a YouTube video (Watch page) to show the panel.");
      isOpen = false;
      removePanel();
      return;
    }

    if (document.getElementById(HOST_ID)) {
      removePanel();
      isOpen = false;
    } else {
      ensurePanel();
      isOpen = true;
    }
  }

  //listen for toolbar clicks (via background message)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "TONNETZ_TOGGLE_PANEL") {
      togglePanel();
    }
  });

  // handling YouTube SPA navigations 
  //if the user left the panel open, keep it open on subsequent Watch pages.
  function attachNavListeners() {
    const reattachIfNeeded = () => {
      if (isOpen) { // checking if it's watch page
        if (onWatchPage()) ensurePanel();
        else removePanel();
      }
    };

    window.addEventListener("yt-navigate-finish", () => {
      // DOM changes after navigation finish; delay a tick
      setTimeout(reattachIfNeeded, 0);
    });
    window.addEventListener("yt-page-data-updated", () =>
      setTimeout(reattachIfNeeded, 0)
    );

    // Fallback observer in case those events don't fire
    const app = document.querySelector("ytd-app") || document.documentElement;
    const mo = new MutationObserver(() => {
      // This runs a lot — keep work minimal
      if (isOpen) {
        if (onWatchPage() && !document.getElementById(HOST_ID)) ensurePanel();
        if (!onWatchPage() && document.getElementById(HOST_ID)) removePanel();
      }
    });
    mo.observe(app, { childList: true, subtree: true });
  }

  attachNavListeners();
})();
