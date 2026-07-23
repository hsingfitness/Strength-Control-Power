from sqlalchemy.orm import Session

from .models import Product

# Mirrors the products originally hard-coded into marketplace.html, so
# switching the page over to the API doesn't change what shoppers see.
# Once this seed runs once, super admins/operators manage products via
# the /admin/products API (and the admin.html dashboard) instead.
DEFAULT_PRODUCTS = [
    dict(
        id="omega-3-fish-oil", name="Premium Omega-3 Fish Oil",
        description="High DHA/EPA for cognitive function and joint health.",
        price=28.99, category="supplements", icon="💊",
        badges=["Best Seller", "Optional"], sort_order=1,
    ),
    dict(
        id="vitamin-d3-5000iu", name="Vitamin D3 5000 IU",
        description="Enhanced absorption formula for bone and immune support.",
        price=18.99, category="supplements", icon="💊",
        badges=["Optional"], sort_order=2,
    ),
    dict(
        id="zinc-selenium-complex", name="Zinc + Selenium Complex",
        description="Advanced immune system support formula.",
        price=22.99, category="supplements", icon="💊",
        badges=["Popular", "Optional"], sort_order=3,
    ),
    dict(
        id="vegan-protein-blend", name="Vegan Protein Blend",
        description="Clean plant-based protein with digestive enzymes.",
        price=39.99, category="supplements", icon="🌿",
        badges=["Optional"], sort_order=4,
    ),
    dict(
        id="magnesium-glycinate-400mg", name="Magnesium Glycinate 400mg",
        description="Supports muscle relaxation, sleep, and nervous system health.",
        price=24.99, category="supplements", icon="🌿",
        badges=["New", "Optional"], sort_order=5,
    ),
    dict(
        id="organic-ashwagandha", name="Organic Ashwagandha",
        description="Adaptogenic herb to manage cortisol and stress response.",
        price=26.99, category="herbs", icon="🌿",
        badges=["Top Rated", "Optional"], sort_order=6,
    ),
    dict(
        id="ginseng-root-extract", name="Ginseng Root Extract",
        description="Traditional herb for energy and vitality enhancement.",
        price=32.99, category="herbs", icon="🌿",
        badges=["Optional"], sort_order=7,
    ),
    dict(
        id="turmeric-curcumin-95", name="Turmeric Curcumin 95%",
        description="Anti-inflammatory properties from premium turmeric extract.",
        price=21.99, category="herbs", icon="🌿",
        badges=["Optional"], sort_order=8,
    ),
    dict(
        id="milk-thistle-liver-support", name="Milk Thistle Liver Support",
        description="Natural liver detoxification and protection.",
        price=19.99, category="herbs", icon="🌿",
        badges=["Optional"], sort_order=9,
    ),
    dict(
        id="smart-blood-pressure-monitor", name="Smart Blood Pressure Monitor",
        description="Bluetooth-connected monitor with companion smartphone app.",
        price=59.99, category="devices", icon="〽",
        badges=["New", "Optional"], sort_order=10,
    ),
    dict(
        id="continuous-glucose-tracker", name="Continuous Glucose Tracker",
        description="Real-time glucose monitoring for metabolic awareness.",
        price=89.99, category="devices", icon="〽",
        badges=["Popular", "Optional"], sort_order=11,
    ),
    dict(
        id="sleep-quality-sensor", name="Sleep Quality Sensor",
        description="Advanced sleep stage tracking for better rest quality.",
        price=49.99, category="devices", icon="〽",
        badges=["Optional"], sort_order=12,
    ),
    dict(
        id="body-composition-scale", name="Body Composition Scale",
        description="Measure body fat, muscle mass, and hydration levels.",
        price=44.99, category="devices", icon="〽",
        badges=["Optional"], sort_order=13,
    ),
    dict(
        id="high-protein-chicken-bowl", name="High-Protein Chicken Bowl",
        description="Lean protein with quinoa and roasted vegetables.",
        price=14.99, category="meals", icon="🍽",
        badges=["Chef's Pick", "Optional"], sort_order=14,
    ),
    dict(
        id="keto-meal-plan-weekly", name="Keto Meal Plan (Weekly)",
        description="7-day ketogenic meal plan for metabolic health.",
        price=79.99, category="meals", icon="🍽",
        badges=["Optional"], sort_order=15,
    ),
    dict(
        id="organic-vegetable-box", name="Organic Vegetable Box",
        description="Fresh seasonal organic vegetables delivered weekly.",
        price=34.99, category="meals", icon="🍽",
        badges=["Optional"], sort_order=16,
    ),
    dict(
        id="low-sugar-dessert-pack", name="Low-Sugar Dessert Pack",
        description="Healthy treats sweetened with natural alternatives.",
        price=18.99, category="meals", icon="🍽",
        badges=["Optional"], sort_order=17,
    ),
    dict(
        id="aromatherapy-diffuser-kit", name="Aromatherapy Diffuser Kit",
        description="Ultrasonic diffuser with 6 essential oil starter blends.",
        price=36.99, category="wellness", icon="♡",
        badges=["Top Rated", "Optional"], sort_order=18,
    ),
    dict(
        id="sleep-sound-machine", name="Sleep Sound Machine",
        description="White noise and nature sounds for deeper, longer sleep.",
        price=42.99, category="wellness", icon="♡",
        badges=["Optional"], sort_order=19,
    ),
    dict(
        id="guided-meditation-app-1yr", name="Guided Meditation App (1yr)",
        description="Structured mindfulness and breathing programs.",
        price=49.99, category="wellness", icon="♡",
        badges=["Popular", "Optional"], sort_order=20,
    ),
    dict(
        id="stress-relief-journal-set", name="Stress Relief Journal Set",
        description="Guided journaling prompts for mental clarity and calm.",
        price=16.99, category="wellness", icon="♡",
        badges=["Optional"], sort_order=21,
    ),
]


def seed_products(db: Session) -> None:
    """Insert any default-catalog product that isn't already in the
    database yet, matched by id. Safe to call on every startup: existing
    products (including ones edited via the admin dashboard) are left
    untouched, and this naturally picks up new items added to
    DEFAULT_PRODUCTS later without needing a manual migration step."""
    existing_ids = {p.id for p in db.query(Product.id).all()}

    added = False
    for data in DEFAULT_PRODUCTS:
        if data["id"] in existing_ids:
            continue
        db.add(Product(**data))
        added = True

    if added:
        db.commit()
