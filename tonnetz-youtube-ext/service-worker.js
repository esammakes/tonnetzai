// when user clicks extension icon, find active tab.
// if it's a Youtube Watch page
// send message to that tab to toggle panel
// otherwise, send message that content script will no go

chrome.action.onClicked.addListener(async (tab) => {
  console.log("[Tonnetz] action clicked", { tabId: tab?.id, url: tab?.url });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TONNETZ_TOGGLE_PANEL" });
    console.log("[Tonnetz] message sent to tab", tab.id);
  } catch (e) {
    console.warn(
      "[Tonnetz] sendMessage failed (content script not injected yet?)",
      e
    );
  }
});
