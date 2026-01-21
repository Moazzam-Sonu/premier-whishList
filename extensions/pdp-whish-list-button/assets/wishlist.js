(() => {
  if (window.PremierWishlistLogicLoaded) return;
  window.PremierWishlistLogicLoaded = true;

  const fallbackApiBaseUrl =
    window.PremierWishlistApiBaseUrl ||
    "https://par-accommodations-frozen-detailed.trycloudflare.com";

  const normalizeId = (value) =>
    value === null || value === undefined ? "" : String(value);

  const cache =
    window.PremierWishlistCache ||
    (window.PremierWishlistCache = { wishlistByCustomer: {} });
  const productCache =
    window.PremierWishlistProductCache ||
    (window.PremierWishlistProductCache = {});

  const getWishlistForCustomer = (customerId, apiBaseUrl) => {
    const key = normalizeId(customerId);
    if (!key) return Promise.resolve([]);
    if (cache.wishlistByCustomer[key]?.data) {
      return Promise.resolve(cache.wishlistByCustomer[key].data);
    }
    if (cache.wishlistByCustomer[key]?.promise) {
      return cache.wishlistByCustomer[key].promise;
    }
    const promise = fetch(
      `${apiBaseUrl}/api/wishlist?customerId=${encodeURIComponent(key)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        cache.wishlistByCustomer[key] = {
          data: data.wishlist || [],
        };
        return cache.wishlistByCustomer[key].data;
      })
      .catch(() => {
        cache.wishlistByCustomer[key] = { data: [] };
        return [];
      });
    cache.wishlistByCustomer[key] = { promise };
    return promise;
  };

  const updateCacheAdd = (customerId, item) => {
    const key = normalizeId(customerId);
    if (!key) return;
    const current = cache.wishlistByCustomer[key]?.data || [];
    if (!current.find((entry) => entry.id === item.id)) {
      cache.wishlistByCustomer[key] = { data: [...current, item] };
    }
  };

  const updateCacheRemove = (customerId, itemId) => {
    const key = normalizeId(customerId);
    if (!key) return;
    const current = cache.wishlistByCustomer[key]?.data || [];
    cache.wishlistByCustomer[key] = {
      data: current.filter((entry) => entry.id !== itemId),
    };
  };

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
        if (!state.variantId) {
          return;
        }
        const items = await getWishlistForCustomer(
          state.customerId,
          state.apiBaseUrl,
        );
        const found = (items || []).find(
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
      if (!state.variantId) return;
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
      if (!state.variantId) return;
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
        if (state.wishlistItemId) {
          updateCacheAdd(state.customerId, {
            id: state.wishlistItemId,
            productId: state.productId,
            variantId: state.variantId || null,
            addedAt: new Date().toISOString(),
          });
        }
      }
    };

    const removeLoggedIn = async () => {
      if (!state.variantId) return;
      const response = await fetch(`${state.apiBaseUrl}/api/wishlist/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlistItemId: state.wishlistItemId }),
      });
      const result = await response.json();
      if (result.success) {
        setActive(false);
        updateCacheRemove(state.customerId, state.wishlistItemId);
        state.wishlistItemId = null;
      }
    };

    const toggleGuest = () => {
      if (!state.variantId) return;
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
      event.stopPropagation();
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
      shop: normalizeId(config.shop),
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
      listEl.classList.add("wishlist-page__grid");
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "wishlist-card";
        row.innerHTML =
          '<div class="wishlist-card__media" data-wishlist-media></div>' +
          '<div class="wishlist-card__body">' +
          '<div class="wishlist-card__title">Loading...</div>' +
          '<div class="wishlist-card__price" data-wishlist-price></div>' +
          '<div class="wishlist-card__actions" data-wishlist-actions></div>' +
          "</div>" +
          '<button type="button" class="wishlist-card__remove" data-wishlist-remove aria-label="Remove from wishlist">×</button>';
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
            updateCacheRemove(state.customerId, item.id);
            loadWishlist();
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
        listEl.appendChild(row);
      });
    };

    const getProductData = async (productId) => {
      const key = normalizeId(productId);
      if (!key || !state.shop) return null;
      if (productCache[key]) return productCache[key];

      try {
        const response = await fetch(
          `${state.apiBaseUrl}/api/detail-product?productId=${encodeURIComponent(
            key,
          )}&shop=${encodeURIComponent(state.shop)}`,
        );
        const result = await response.json();
        const product = result?.data?.data?.product;
        if (!product) {
          productCache[key] = null;
          return null;
        }
        const firstVariant = product.variants?.edges?.[0]?.node || null;
        const price = firstVariant?.price || null;
        const variantGid = firstVariant?.id || null;
        const variantNumericId = variantGid
          ? variantGid.split("/").pop()
          : null;
        const totalInventory =
          typeof product.totalInventory === "number"
            ? product.totalInventory
            : null;
        const variantInventory =
          typeof firstVariant?.inventoryQuantity === "number"
            ? firstVariant.inventoryQuantity
            : null;
        const inStock =
          (totalInventory !== null && totalInventory > 0) ||
          (variantInventory !== null && variantInventory > 0);
        productCache[key] = {
          title: product.title,
          handle: product.handle,
          imageUrl: product.featuredImage?.url || null,
          imageAlt: product.featuredImage?.altText || product.title,
          price,
          variantId: variantNumericId,
          inStock,
        };
        return productCache[key];
      } catch {
        productCache[key] = null;
        return null;
      }
    };

    const hydrateProductCards = async (items) => {
      if (!listEl || !items.length) return;
      const cards = Array.from(listEl.querySelectorAll(".wishlist-card"));
      await Promise.all(
        items.map(async (item, index) => {
          const card = cards[index];
          if (!card) return;
          const product = await getProductData(item.productId);
          const media = card.querySelector("[data-wishlist-media]");
          const titleEl = card.querySelector(".wishlist-card__title");
          const priceEl = card.querySelector("[data-wishlist-price]");
          const actionsEl = card.querySelector("[data-wishlist-actions]");
          if (!product) {
            if (titleEl) {
              titleEl.textContent = `Product ${item.productId}`;
            }
            return;
          }
          if (media) {
            if (product.imageUrl) {
              const link = document.createElement("a");
              link.href = `/products/${product.handle}`;
              link.className = "wishlist-card__link";
              const img = document.createElement("img");
              img.src = product.imageUrl;
              img.alt = product.imageAlt || "";
              img.loading = "lazy";
              img.className = "wishlist-card__image";
              link.appendChild(img);
              media.appendChild(link);
            } else {
              media.classList.add("wishlist-card__media--empty");
            }
          }
          if (titleEl) {
            const link = document.createElement("a");
            link.href = `/products/${product.handle}`;
            link.textContent = product.title;
            link.className = "wishlist-card__link";
            titleEl.textContent = "";
            titleEl.appendChild(link);
          }
          if (priceEl && product.price) {
            priceEl.textContent = product.price;
          }
          if (actionsEl) {
            actionsEl.innerHTML = "";
            if (product.inStock === false) {
              const badge = document.createElement("div");
              badge.className = "wishlist-card__stock";
              badge.textContent = "Out of stock";
              actionsEl.appendChild(badge);
              return;
            }
            const variantId = item.variantId || product.variantId;
            if (variantId) {
              const form = document.createElement("form");
              form.method = "post";
              form.action = "/cart/add";
              form.innerHTML =
                '<input type="hidden" name="id" value="' +
                variantId +
                '">' +
                '<button type="submit" class="wishlist-card__add">Add to cart</button>';
              actionsEl.appendChild(form);
            }
          }
        }),
      );
    };

    const loadWishlist = async () => {
      setError("");
      setLoading(true);
      const logDebugProduct = async (productId) => {
        if (!productId) return;
        if (window.PremierWishlistDebugLogged) return;
        window.PremierWishlistDebugLogged = true;
        try {
          const response = await fetch(
            `${state.apiBaseUrl}/api/detail-product?productId=${encodeURIComponent(
              productId,
            )}&shop=${encodeURIComponent(state.shop)}`,
          );
          const data = await response.json();
          console.log("wishlist detail product", data);
        } catch (err) {
          console.log("wishlist detail product error", err);
        }
      };
      if (state.customerId) {
        try {
          const items = await getWishlistForCustomer(
            state.customerId,
            state.apiBaseUrl,
          );
          renderItems(items || []);
          await hydrateProductCards(items || []);
          if (items && items.length) {
            logDebugProduct(items[0].productId);
          }
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
      await hydrateProductCards(items);
      if (items && items.length) {
        logDebugProduct(items[0].productId);
      }
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
