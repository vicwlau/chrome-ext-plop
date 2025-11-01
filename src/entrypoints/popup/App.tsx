function App() {
  const handleOpenSidepanel = async () => {
    try {
      // Get the current window
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.id) {
        // Open the sidepanel for this window
        await chrome.sidePanel.open({ windowId: currentWindow.id });
        // Optionally close the popup after opening sidepanel
        window.close();
      }
    } catch (error) {
      console.error("Failed to open sidepanel:", error);
    }
  };

  return (
    <div className="">
      <button
        onClick={handleOpenSidepanel}
        className="bg-white w-32 hover:bg-gray-200 px-3 py-1.5 text-lg font-bold  text-blue-950 shadow-sm transition-colors"
      >
        start plopping
      </button>
    </div>
  );
}

export default App;
