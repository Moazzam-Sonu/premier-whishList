(() => {
  if (window.PremierWishlistLogicLoaded) return;
  window.PremierWishlistLogicLoaded = true;

  const fallbackApiBaseUrl =
    window.PremierWishlistApiBaseUrl ||
    "https://cork-acceptance-modern-thats.trycloudflare.com";

  const normalizeId = (value) =>
    value === null || value === undefined ? "" : String(value);

  const initButton = (button) => {
    if (!button || button.dataset.wishlistReady === "true") return;
    button.dataset.wishlistReady = "true";

    let config = {};
    try {
      config = JSON.parse(button.dataset.wishlistConfig || "{}");
    } catch {
      config = {};
    }

    const state = {
      wishlisted: false,
      wishlistItemId: null,
      isLoading: false,
      customerId: normalizeId(config.customerId),
      customerEmail: normalizeId(config.customerEmail),
      productId: normalizeId(config.productId),
      variantId: normalizeId(config.variantId),
      apiBaseUrl: normalizeId(config.apiBaseUrl) || fallbackApiBaseUrl,
    };

    const setLoading = (value) => {
      state.isLoading = value;
      button.disabled = value;
    };

    const setActive = (value) => {
      state.wishlisted = value;
      button.classList.toggle("is-active", value);
      button.setAttribute("aria-pressed", value ? "true" : "false");
    };

    const loadFromApi = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${state.apiBaseUrl}/api/wishlist?customerId=${encodeURIComponent(
            state.customerId,
          )}`,
        );
        const data = await response.json();
        const found = (data.wishlist || []).find(
          (item) =>
            normalizeId(item.productId) === state.productId &&
            normalizeId(item.variantId) === state.variantId,
        );
        if (found) {
          setActive(true);
          state.wishlistItemId = found.id;
        }
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };

    const loadFromGuest = () => {
      const guestWishlist = JSON.parse(
        localStorage.getItem("guestWishlist") || "[]",
      );
      const found = guestWishlist.find(
        (item) =>
          normalizeId(item.productId) === state.productId &&
          normalizeId(item.variantId) === state.variantId,
      );
      if (found) {
        setActive(true);
      }
    };

    const addLoggedIn = async () => {
      const response = await fetch(`${state.apiBaseUrl}/api/wishlist/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: state.customerId,
          email: state.customerEmail,
          productId: state.productId,
          variantId: state.variantId || null,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setActive(true);
        state.wishlistItemId = result.wishlistItemId || null;
      }
    };

    const removeLoggedIn = async () => {
      const response = await fetch(`${state.apiBaseUrl}/api/wishlist/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlistItemId: state.wishlistItemId }),
      });
      const result = await response.json();
      if (result.success) {
        setActive(false);
        state.wishlistItemId = null;
      }
    };

    const toggleGuest = () => {
      let guestWishlist = JSON.parse(
        localStorage.getItem("guestWishlist") || "[]",
      );
      const index = guestWishlist.findIndex(
        (item) =>
          normalizeId(item.productId) === state.productId &&
          normalizeId(item.variantId) === state.variantId,
      );

      if (!state.wishlisted) {
        if (index === -1) {
          guestWishlist.push({
            productId: state.productId,
            variantId: state.variantId || null,
          });
          localStorage.setItem("guestWishlist", JSON.stringify(guestWishlist));
          setActive(true);
        }
      } else if (index !== -1) {
        guestWishlist.splice(index, 1);
        localStorage.setItem("guestWishlist", JSON.stringify(guestWishlist));
        setActive(false);
      }
    };

    const hydrate = () => {
      if (state.customerId) {
        loadFromApi();
      } else {
        loadFromGuest();
      }
    };

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      if (state.isLoading) return;

      if (state.customerId) {
        setLoading(true);
        try {
          if (!state.wishlisted) {
            await addLoggedIn();
          } else if (state.wishlistItemId) {
            await removeLoggedIn();
          }
        } finally {
          setLoading(false);
        }
      } else {
        toggleGuest();
      }
    });

    hydrate();
  };

  const renderWishlistPage = (container) => {
    if (!container || container.dataset.wishlistReady === "true") return;
    container.dataset.wishlistReady = "true";

    let config = {};
    try {
      config = JSON.parse(container.dataset.wishlistConfig || "{}");
    } catch {
      config = {};
    }

    const state = {
      customerId: normalizeId(config.customerId),
      apiBaseUrl: normalizeId(config.apiBaseUrl) || fallbackApiBaseUrl,
    };

    const listEl = container.querySelector("[data-wishlist-list]");
    const emptyEl = container.querySelector("[data-wishlist-empty]");
    const loadingEl = container.querySelector("[data-wishlist-loading]");
    const errorEl = container.querySelector("[data-wishlist-error]");

    const setLoading = (value) => {
      if (loadingEl) loadingEl.style.display = value ? "" : "none";
    };

    const setEmpty = (value) => {
      if (emptyEl) emptyEl.style.display = value ? "" : "none";
    };

    const setError = (message) => {
      if (!errorEl) return;
      errorEl.textContent = message || "";
      errorEl.style.display = message ? "" : "none";
    };

    const getGuestItems = () => {
      const guestWishlist = JSON.parse(
        localStorage.getItem("guestWishlist") || "[]",
      );
      return guestWishlist.map((item) => ({
        id: `${normalizeId(item.productId)}:${normalizeId(item.variantId)}`,
        productId: normalizeId(item.productId),
        variantId: normalizeId(item.variantId),
      }));
    };

    const renderItems = (items) => {
      if (!listEl) return;
      listEl.innerHTML = "";
      if (!items.length) {
        setEmpty(true);
        return;
      }
      setEmpty(false);
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "wishlist-page__row";
        row.innerHTML =
          '<div class="wishlist-page__meta">' +
          `<div>Product ID: ${item.productId}</div>` +
          (item.variantId ? `<div>Variant ID: ${item.variantId}</div>` : "") +
          (item.addedAt ? `<div>Added: ${item.addedAt}</div>` : "") +
          "</div>" +
          '<button type="button" class="wishlist-page__remove" data-wishlist-remove>Remove</button>';
        const removeButton = row.querySelector("[data-wishlist-remove]");
        removeButton?.addEventListener("click", async () => {
          setError("");
          if (!state.customerId) {
            const guestWishlist = JSON.parse(
              localStorage.getItem("guestWishlist") || "[]",
            );
            const next = guestWishlist.filter(
              (entry) =>
                normalizeId(entry.productId) !== normalizeId(item.productId) ||
                normalizeId(entry.variantId) !== normalizeId(item.variantId),
            );
            localStorage.setItem("guestWishlist", JSON.stringify(next));
            loadWishlist();
            return;
          }

          try {
            const response = await fetch(
              `${state.apiBaseUrl}/api/wishlist/remove`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wishlistItemId: item.id }),
              },
            );
            const result = await response.json();
            if (!result.success) {
              setError(result.error || "Failed to remove item");
              return;
            }
            loadWishlist();
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
        listEl.appendChild(row);
      });
    };

    const loadWishlist = async () => {
      setError("");
      setLoading(true);
      if (state.customerId) {
        try {
          const response = await fetch(
            `${state.apiBaseUrl}/api/wishlist?customerId=${encodeURIComponent(
              state.customerId,
            )}`,
          );
          const data = await response.json();
          renderItems(data.wishlist || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          renderItems([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      const items = getGuestItems();
      renderItems(items);
      setLoading(false);
    };

    loadWishlist();
  };

  const initAll = (root) => {
    root
      .querySelectorAll("[data-wishlist-button]")
      .forEach((button) => initButton(button));
    root
      .querySelectorAll("[data-wishlist-page]")
      .forEach((container) => renderWishlistPage(container));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAll(document));
  } else {
    initAll(document);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.("[data-wishlist-button]")) {
          initButton(node);
        }
        if (node.querySelectorAll) {
          initAll(node);
        }
      });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
