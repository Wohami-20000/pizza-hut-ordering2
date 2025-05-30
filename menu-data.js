// Pizza Hut Menu Data Structure with Unique IDs

const menu = [
  {
    category: "Pair Deals",
    id: "cat_pair_deals", // Unique ID for the category
    items: [
      { id: "item_pair_deals_2_pizzas_small", name: "2 Pizzas Small", desc: "🍟 1 Potatoes + 1 Boisson 33cl offerts", price: 95 },
      { id: "item_pair_deals_2_pizzas_medium", name: "2 Pizzas Medium", desc: "🍟 1 Potatoes + 1 Boisson 33cl offerts", price: 170 },
      { id: "item_pair_deals_2_pizzas_large", name: "2 Pizzas Large", desc: "🍟 1 Potatoes + 1 Boisson 33cl offerts", price: 230 }
    ]
  },
  {
    category: "Pizzas",
    id: "cat_pizzas", // Unique ID for the category
    subcategories: [
      {
        id: "subcat_pizzas_margherita", // Unique ID for subcategory
        name: "Margherita",
        desc: "Mozzarella, sauce tomate aux herbes",
        sizes: [
          { id: "size_margherita_individual", size: "Individual", price: 45 },
          { id: "size_margherita_double", size: "Double", price: 80 },
          { id: "size_margherita_triple", size: "Triple", price: 100 }
        ]
      },
      {
        id: "subcat_pizzas_inedites", // Unique ID for subcategory
        name: "Inédites",
        desc: "",
        recipes: [
          "Marina",
          "Forestière",
          "Beefy",
          "Spicy Hot (Boeuf ou Poulet)",
          "Poulet Sauce BBQ",
          "Végétarienne"
        ],
        sizes: [
          { id: "size_inedites_individual", size: "Individual", price: 60 },
          { id: "size_inedites_double", size: "Double", price: 115 },
          { id: "size_inedites_triple", size: "Triple", price: 145 }
        ]
      },
      {
        id: "subcat_pizzas_speciales", // Unique ID for subcategory
        name: "Spéciales",
        desc: "",
        recipes: [
          "Poulet Sauce Ranch",
          "Suprême",
          "Pepperoni Lovers"
        ],
        sizes: [
          { id: "size_speciales_individual", size: "Individual", price: 65 },
          { id: "size_speciales_double", size: "Double", price: 125 },
          { id: "size_speciales_triple", size: "Triple", price: 155 }
        ]
      },
      {
        id: "subcat_pizzas_gourmandes", // Unique ID for subcategory
        name: "Gourmandes",
        desc: "",
        recipes: [
          "Pêcheur",
          "Super Suprême",
          "Fruits de Mer (Sauce Alfredo)"
        ],
        sizes: [
          { id: "size_gourmandes_individual", size: "Individual", price: 70 },
          { id: "size_gourmandes_double", size: "Double", price: 135 },
          { id: "size_gourmandes_triple", size: "Triple", price: 170 }
        ]
      }
    ],
    options: [
      { id: "opt_pizzas_cheezy_crust", name: "Cheezy Crust", price: { Individual: 10, Double: 15, Triple: 15 }, desc: "Ajoutez Cheezy Crust à votre pizza" }
    ]
  },
  {
    category: "Specialties",
    id: "cat_specialties", // Unique ID for the category
    items: [
      { id: "item_specialties_calzone", name: "Calzone", price: 48 },
      { id: "item_specialties_sandwich", name: "Sandwich", price: 50 },
      { id: "item_specialties_pates_baked", name: "Pâtes Baked", price: 55, desc: "Penne au four" },
      { id: "item_specialties_penne_poulet_creme_tomate", name: "Penne Poulet Crème Tomate", price: 55 },
      { id: "item_specialties_penne_fruits_mer_alfredo", name: "Penne Fruits de Mer Sauce Alfredo", price: 55 },
      { id: "item_specialties_penne_poulet_alfredo", name: "Penne Poulet Alfredo", price: 55 }
    ]
  },
  {
    category: "Sides",
    id: "cat_sides", // Unique ID for the category
    items: [
      { id: "item_sides_potatoes", name: "Potatoes", price: 19 },
      { id: "item_sides_pain_ail_fromage", name: "Pain à l’Ail Fromage", price: 23 },
      { id: "item_sides_pain_ail_pepperoni", name: "Pain à l’Ail Pepperoni", price: 27 },
      { id: "item_sides_pepperoni_breadsticks", name: "Pepperoni Breadsticks", price: 39 },
      { id: "item_sides_cheezy_pops_12", name: "Cheezy Pops 12 pcs", price: 35 },
      { id: "item_sides_cheezy_pops_24", name: "Cheezy Pops 24 pcs", price: 49 },
      { id: "item_sides_nuggets_6", name: "Nuggets 6 pcs", price: 34 },
      { id: "item_sides_nuggets_9", name: "Nuggets 9 pcs", price: 44 },
      { id: "item_sides_nuggets_15", name: "Nuggets 15 pcs", price: 65 },
      { id: "item_sides_chicken_wings_4", name: "Chicken Wings 4 pcs", price: 38 },
      { id: "item_sides_chicken_wings_6", name: "Chicken Wings 6 pcs", price: 48 },
      { id: "item_sides_chicken_wings_10", name: "Chicken Wings 10 pcs", price: 68 },
      { id: "item_sides_trio_combo", name: "Trio Combo", price: 60, desc: "Pepperoni Breadsticks + Potatoes + 4 Chicken Wings" }
    ]
  },
  {
    category: "Desserts",
    id: "cat_desserts", // Unique ID for the category
    items: [
      { id: "item_desserts_glace_chocolat", name: "Glace Chocolat", price: 29 },
      { id: "item_desserts_glace_cookie_vanille", name: "Glace Cookie-Vanille", price: 29 },
      { id: "item_desserts_yaourt_fruits_bois", name: "Yaourt Fruits des Bois", price: 29 },
      { id: "item_desserts_sorbet_fraise", name: "Sorbet Fraise", price: 29 },
      { id: "item_desserts_sorbet_mangue", name: "Sorbet Mangue", price: 29 }
    ]
  },
  {
    category: "Drinks",
    id: "cat_drinks", // Unique ID for the category
    items: [
      { id: "item_drinks_pepsi_33", name: "Pepsi 33cl", price: 13 },
      { id: "item_drinks_pepsi_def_33", name: "Pepsi Déf 33cl", price: 13 },
      { id: "item_drinks_seven_up_33", name: "Seven Up 33cl", price: 13 },
      { id: "item_drinks_mirinda_33", name: "Mirinda 33cl", price: 13 },
      { id: "item_drinks_pepsi_1l", name: "Pepsi 1L", price: 15 },
      { id: "item_drinks_pepsi_def_1l", name: "Pepsi Déf 1L", price: 15 },
      { id: "item_drinks_seven_up_1l", name: "Seven Up 1L", price: 15 },
      { id: "item_drinks_mirinda_1l", name: "Mirinda 1L", price: 15 },
      { id: "item_drinks_pepsi_1_5l", name: "Pepsi 1.5L", price: 17 },
      { id: "item_drinks_pepsi_def_1_5l", name: "Pepsi Déf 1.5L", price: 17 },
      { id: "item_drinks_seven_up_1_5l", name: "Seven Up 1.5L", price: 17 },
      { id: "item_drinks_mirinda_1_5l", name: "Mirinda 1.5L", price: 17 }
    ]
  },
  {
    category: "Promotions",
    id: "cat_promotions", // Unique ID for the category
    items: [
      { id: "item_promo_pair_deal_soda", name: "Pair Deal + Soda", desc: "2 Pizzas Individuelles – 95 DH, 2 Pizzas Doubles – 170 DH, 2 Pizzas Triples – 230 DH" },
      { id: "item_promo_cheezy_crust_deal", name: "Cheezy Crust", desc: "+10/15 DH • Spéciale +10 DH • Gourmande +20 DH" },
      { id: "item_promo_pizza_pepsi_offert", name: "1 Pizza = 1 Pepsi Offert" },
      { id: "item_promo_pizza_double", name: "Pizza Double", price: 125 },
      { id: "item_promo_pizza_triple", name: "Pizza Triple", price: 145 },
      { id: "item_promo_dejeuner_express", name: "Déjeuner Express", desc: "Pizza Individuelle + Soda 33cl – 60 DH, Potatoes ou Pain à l’Ail – 75 DH" },
      { id: "item_promo_hut_feast", name: "Hut Feast", price: 165, desc: "1 Pizza Double Cheezy Crust, 1 Pizza Individuelle, Potatoes + Pepsi 1L" },
      { id: "item_promo_combo_sides", name: "Combo Sides", price: 50, desc: "Potatoes + 4 Chicken Wings + 4 Garlic Breads" }
    ]
  }
];