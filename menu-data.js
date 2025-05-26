// Pizza Hut Menu Data Structure

const menu = [
  {
    category: "Pair Deals",
    items: [
      { name: "2 Pizzas Small", desc: "🍟 1 Potatoes + 1 Boisson 33cl offerts", price: 95 },
      { name: "2 Pizzas Medium", desc: "🍟 1 Potatoes + 1 Boisson 33cl offerts", price: 170 },
      { name: "2 Pizzas Large", desc: "🍟 1 Potatoes + 1 Boisson 33cl offerts", price: 230 }
    ]
  },
  {
    category: "Pizzas",
    subcategories: [
      {
        name: "Margherita",
        desc: "Mozzarella, sauce tomate aux herbes",
        sizes: [
          { size: "Individual", price: 45 },
          { size: "Double", price: 80 },
          { size: "Triple", price: 100 }
        ]
      },
      {
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
          { size: "Individual", price: 60 },
          { size: "Double", price: 115 },
          { size: "Triple", price: 145 }
        ]
      },
      {
        name: "Spéciales",
        desc: "",
        recipes: [
          "Poulet Sauce Ranch",
          "Suprême",
          "Pepperoni Lovers"
        ],
        sizes: [
          { size: "Individual", price: 65 },
          { size: "Double", price: 125 },
          { size: "Triple", price: 155 }
        ]
      },
      {
        name: "Gourmandes",
        desc: "",
        recipes: [
          "Pêcheur",
          "Super Suprême",
          "Fruits de Mer (Sauce Alfredo)"
        ],
        sizes: [
          { size: "Individual", price: 70 },
          { size: "Double", price: 135 },
          { size: "Triple", price: 170 }
        ]
      }
    ],
    options: [
      { name: "Cheezy Crust", price: { Individual: 10, Double: 15, Triple: 15 }, desc: "Ajoutez Cheezy Crust à votre pizza" }
    ]
  },
  {
    category: "Specialties",
    items: [
      { name: "Calzone", price: 48 },
      { name: "Sandwich", price: 50 },
      { name: "Pâtes Baked", price: 55, desc: "Penne au four" },
      { name: "Penne Poulet Crème Tomate", price: 55 },
      { name: "Penne Fruits de Mer Sauce Alfredo", price: 55 },
      { name: "Penne Poulet Alfredo", price: 55 }
    ]
  },
  {
    category: "Sides",
    items: [
      { name: "Potatoes", price: 19 },
      { name: "Pain à l’Ail Fromage", price: 23 },
      { name: "Pain à l’Ail Pepperoni", price: 27 },
      { name: "Pepperoni Breadsticks", price: 39 },
      { name: "Cheezy Pops 12 pcs", price: 35 },
      { name: "Cheezy Pops 24 pcs", price: 49 },
      { name: "Nuggets 6 pcs", price: 34 },
      { name: "Nuggets 9 pcs", price: 44 },
      { name: "Nuggets 15 pcs", price: 65 },
      { name: "Chicken Wings 4 pcs", price: 38 },
      { name: "Chicken Wings 6 pcs", price: 48 },
      { name: "Chicken Wings 10 pcs", price: 68 },
      { name: "Trio Combo", price: 60, desc: "Pepperoni Breadsticks + Potatoes + 4 Chicken Wings" }
    ]
  },
  {
    category: "Desserts",
    items: [
      { name: "Glace Chocolat", price: 29 },
      { name: "Glace Cookie-Vanille", price: 29 },
      { name: "Yaourt Fruits des Bois", price: 29 },
      { name: "Sorbet Fraise", price: 29 },
      { name: "Sorbet Mangue", price: 29 }
    ]
  },
  {
    category: "Drinks",
    items: [
      { name: "Pepsi 33cl", price: 13 },
      { name: "Pepsi Déf 33cl", price: 13 },
      { name: "Seven Up 33cl", price: 13 },
      { name: "Mirinda 33cl", price: 13 },
      { name: "Pepsi 1L", price: 15 },
      { name: "Pepsi Déf 1L", price: 15 },
      { name: "Seven Up 1L", price: 15 },
      { name: "Mirinda 1L", price: 15 },
      { name: "Pepsi 1.5L", price: 17 },
      { name: "Pepsi Déf 1.5L", price: 17 },
      { name: "Seven Up 1.5L", price: 17 },
      { name: "Mirinda 1.5L", price: 17 }
    ]
  },
  {
    category: "Promotions",
    items: [
      { name: "Pair Deal + Soda", desc: "2 Pizzas Individuelles – 95 DH, 2 Pizzas Doubles – 170 DH, 2 Pizzas Triples – 230 DH" },
      { name: "Cheezy Crust", desc: "+10/15 DH • Spéciale +10 DH • Gourmande +20 DH" },
      { name: "1 Pizza = 1 Pepsi Offert" },
      { name: "Pizza Double", price: 125 },
      { name: "Pizza Triple", price: 145 },
      { name: "Déjeuner Express", desc: "Pizza Individuelle + Soda 33cl – 60 DH, Potatoes ou Pain à l’Ail – 75 DH" },
      { name: "Hut Feast", price: 165, desc: "1 Pizza Double Cheezy Crust, 1 Pizza Individuelle, Potatoes + Pepsi 1L" },
      { name: "Combo Sides", price: 50, desc: "Potatoes + 4 Chicken Wings + 4 Garlic Breads" }
    ]
  }
];