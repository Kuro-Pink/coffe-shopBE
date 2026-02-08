import Order from '../models/Order';

export type ChatAction =
  | 'SHOW_RECOMMEND'
  | 'SHOW_DRINK'
  | 'SHOW_COFFEE'
  | 'SHOW_MILK_TEA'
  | 'SHOW_TEA'
  | 'SHOW_JUICE'
  | 'SHOW_SMOOTHIE'
  | 'SHOW_YOGURT'
  | 'SHOW_MATCHA'
  | 'SHOW_ICE_BLENDED'
  | 'SHOW_DESSERT'
  | 'SHOW_SNACK'
  | 'SHOW_CAKE'
  | 'SHOW_COFFEE_PAIRING'
  | 'AFTER_ADD_TO_CART' // 🆕 upsell sau khi thêm giỏ
  | 'BEST_SELLER_DRINK'
  | 'MORNING_DRINK'
  | 'COLD_WEATHER'
  | 'LESS_ICE'
  | 'HOT_DRINK';

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const mapProducts = (products: any[]) =>
  products.map((p) => ({
    name: p.name,
    price: p.price,
    normName: normalize(p.name),
    category: normalize(p.category || ''),
  }));

const pick = (list: any[], reply: string, limit = 6) => ({
  reply,
  products: list.slice(0, limit).map((p) => ({ name: p.name, price: p.price })),
});

const suggestAlternativeSnack = (mapped: any[]) => {
  const snack = mapped.filter((p) =>
    ['huong duong', 'bim bim', 'snack', 'kho ga', 'kho bo'].some((k) => p.normName.includes(k)),
  );
  return snack.slice(0, 3).map((p) => ({ name: p.name, price: p.price }));
};

export const chatAIReply = async (action: ChatAction, products: any[]) => {
  const mapped = mapProducts(products);

  // ===== RECOMMEND =====
  if (action === 'SHOW_RECOMMEND')
    return pick(mapped, 'Mấy món này đang được khách gọi nhiều nè 😋');

  if (action === 'BEST_SELLER_DRINK') {
    const drinks = mapped.filter((p) =>
      [
        'ca phe',
        'coffee',
        'tra',
        'tra sua',
        'matcha',
        'nuoc ep',
        'sinh to',
        'da xay',
        'sua chua',
      ].some((k) => p.normName.includes(k)),
    );

    return pick(drinks, 'Mấy món nước bán chạy nhất quán đây nè 🥤🔥', 5);
  }

  if (action === 'MORNING_DRINK') {
    const morning = mapped.filter((p) =>
      ['ca phe', 'coffee', 'bac xiu', 'espresso', 'latte', 'capuchino', 'tra nong'].some((k) =>
        p.normName.includes(k),
      ),
    );

    return pick(morning, 'Buổi sáng làm ly này tỉnh cả người luôn nè ☀️☕');
  }

  if (action === 'LESS_ICE') {
    const warm = mapped.filter((p) =>
      ['nong', 'hot', 'tra nong', 'ca phe', 'matcha', 'cacao'].some((k) => p.normName.includes(k)),
    );

    return pick(warm, 'Trời lạnh uống mấy món ấm này là hết sảy luôn đó 🥶🔥');
  }

  if (action === 'HOT_DRINK') {
    const hotDrinks = mapped.filter(
      (p) =>
        [
          'ca phe',
          'coffee',
          'bac xiu',
          'latte',
          'capuchino',
          'espresso',
          'matcha',
          'cacao',
          'tra',
        ].some((k) => p.normName.includes(k)) &&
        // ❌ loại mấy món chắc chắn lạnh
        !['tra sua', 'sinh to', 'nuoc ep', 'da xay', 'sua chua', 'ice blended'].some((k) =>
          p.normName.includes(k),
        ),
    );

    return hotDrinks.length
      ? pick(hotDrinks, 'Mấy món này có thể pha nóng cho bạn nè 🔥☕', 5)
      : {
          reply: 'Hiện menu chưa có món phù hợp để pha nóng rồi ạ 😥',
          products: [],
        };
  }

  // ===== AFTER ADD TO CART =====
  if (action === 'AFTER_ADD_TO_CART') {
    const coffeeSnack = mapped.filter((p) =>
      ['huong duong', 'cookie', 'tiramisu', 'croissant'].some((k) => p.normName.includes(k)),
    );

    if (coffeeSnack.length) {
      return {
        reply:
          'Uống nước mà có thêm chút ăn vặt nữa là hết sảy đó 😋 Bạn dùng kèm mấy món này không?',
        action: 'SUGGEST_SNACK',
        products: coffeeSnack.slice(0, 3).map((p) => ({ name: p.name, price: p.price })),
      };
    }

    return {
      reply: 'Bạn có muốn gọi thêm món khác hay combo gì nữa không ạ?',
      action: 'ASK_ADD_MORE',
      products: [],
    };
  }

  // ===== COFFEE =====
  if (action === 'SHOW_COFFEE') {
    const list = mapped.filter((p) =>
      ['ca phe', 'coffee', 'bac xiu', 'latte', 'capuchino', 'espresso'].some((k) =>
        p.normName.includes(k),
      ),
    );
    return list.length
      ? pick(list, 'Cà phê quán mình đây nè ☕')
      : {
          reply: 'Cà phê hôm nay tạm hết mất rồi 😥 Bạn thử trà sữa hoặc matcha nha!',
          products: suggestAlternativeSnack(mapped),
        };
  }

  // ===== MILK TEA =====
  if (action === 'SHOW_MILK_TEA') {
    const list = mapped.filter((p) => p.normName.includes('tra sua'));
    return list.length
      ? pick(list, 'Trà sữa best seller đây 🧋')
      : {
          reply: 'Trà sữa đang hết topping rồi ạ 😥 Bạn thử sinh tố hoặc đá xay nha!',
          products: [],
        };
  }

  // ===== TEA =====
  if (action === 'SHOW_TEA') {
    const list = mapped.filter((p) =>
      ['tra hoa cuc', 'tra vai', 'tra chanh', 'tra mang cau', 'tra dao'].some((k) =>
        p.normName.includes(k),
      ),
    );
    return list.length
      ? pick(list, 'Các loại trà thanh mát đây nè 🍵')
      : { reply: 'Trà hôm nay tạm hết rồi ạ 😥', products: [] };
  }

  // ===== JUICE =====
  if (action === 'SHOW_JUICE') {
    const list = mapped.filter((p) => p.normName.includes('nuoc ep'));
    return list.length
      ? pick(list, 'Nước ép tươi đây ạ 🍊')
      : { reply: 'Nước ép tạm hết mất rồi 😥', products: [] };
  }

  // ===== SMOOTHIE =====
  if (action === 'SHOW_SMOOTHIE') {
    const list = mapped.filter((p) => p.normName.includes('sinh to'));
    return list.length
      ? pick(list, 'Sinh tố mát lạnh đây 🥭')
      : { reply: 'Sinh tố đang hết trái cây mất rồi 😥', products: [] };
  }

  // ===== YOGURT =====
  if (action === 'SHOW_YOGURT') {
    const list = mapped.filter((p) => p.normName.includes('sua chua'));
    return list.length
      ? pick(list, 'Sữa chua mát lạnh đây nha 🍨')
      : { reply: 'Sữa chua tạm hết ạ 😥', products: [] };
  }

  // ===== MATCHA =====
  if (action === 'SHOW_MATCHA') {
    const list = mapped.filter((p) => p.normName.includes('matcha'));
    return list.length
      ? pick(list, 'Matcha thơm béo đây 🍵')
      : { reply: 'Matcha hôm nay hết rồi ạ 😥', products: [] };
  }

  // ===== ICE BLENDED =====
  if (action === 'SHOW_ICE_BLENDED') {
    const list = mapped.filter((p) =>
      ['da xay', 'ice blended'].some((k) => p.normName.includes(k)),
    );
    return list.length
      ? pick(list, 'Đá xay mát lạnh đây nè ❄️')
      : { reply: 'Đá xay đang bảo trì máy xay mất rồi 😥', products: [] };
  }

  // ===== CAKE =====
  if (action === 'SHOW_CAKE') {
    const list = mapped.filter((p) =>
      ['banh', 'cake', 'tiramisu', 'bong lan', 'croissant', 'cookie'].some((k) =>
        p.normName.includes(k),
      ),
    );
    return list.length
      ? pick(list, 'Bánh ngọt của quán đây 🍰')
      : { reply: 'Bánh ngọt hôm nay bán hết rồi ạ 😥', products: suggestAlternativeSnack(mapped) };
  }

  // ===== SNACK =====
  if (action === 'SHOW_SNACK') {
    const list = mapped.filter((p) =>
      ['huong duong', 'bim bim', 'snack', 'kho ga', 'kho bo'].some((k) => p.normName.includes(k)),
    );
    return list.length
      ? pick(list, 'Món ăn vặt nhâm nhi đây 😋')
      : { reply: 'Đồ ăn vặt hôm nay hết mất rồi ạ 😥', products: [] };
  }

  // ===== COFFEE PAIRING =====
  if (action === 'SHOW_COFFEE_PAIRING') {
    const list = mapped.filter((p) =>
      ['banh', 'cookie', 'croissant', 'tiramisu'].some((k) => p.normName.includes(k)),
    );
    return list.length
      ? pick(list, 'Uống cà phê ăn kèm mấy món này là hợp bài lắm ☕🍰')
      : { reply: 'Hết món ăn kèm rồi ạ 😥', products: [] };
  }

  return { reply: 'Bạn chọn món trên menu giúp mình nha 😊', products: [] };
};

export const suggestOrderByPhone = async (phone: string) => {
  const lastOrder = await Order.findOne({
    customerPhone: phone,
    status: { $ne: 'cancelled' },
  }).sort({ createdAt: -1 });
  if (!lastOrder)
    return { hasHistory: false, message: 'Anh/chị là khách mới, để em gợi ý món nhé 😊' };

  return {
    hasHistory: true,
    message: `Lần trước anh/chị gọi ${lastOrder.items.map((i) => i.name).join(', ')}. Mình gọi lại không ạ?`,
    applyData: {
      items: lastOrder.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      note: lastOrder.customerNote,
    },
  };
};
export const analyzeCustomerByPhone = async (phone: string) => {
  const orders = await Order.find({ customerPhone: phone, status: { $ne: 'cancelled' } });
  if (!orders.length)
    return {
      type: 'new',
      totalOrders: 0,
      totalSpent: 0,
      favoriteItems: '',
      description: 'Khách mới.',
    };

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);

  const map: Record<string, number> = {};
  orders.forEach((o) => o.items.forEach((i) => (map[i.name] = (map[i.name] || 0) + i.quantity)));
  const fav = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((i) => i[0])
    .join(', ');

  let type = 'regular';
  if (totalOrders >= 5) type = 'loyal';
  if (totalOrders >= 8 || totalSpent >= 500000) type = 'vip';

  return {
    type,
    totalOrders,
    totalSpent,
    favoriteItems: fav,
    description:
      type === 'vip'
        ? 'Khách VIP 💎'
        : type === 'loyal'
          ? 'Khách quen 👍'
          : 'Khách ghé quán thỉnh thoảng.',
  };
};
