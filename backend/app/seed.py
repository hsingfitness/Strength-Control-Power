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
]


def seed_products(db: Session) -> None:
    """Insert the default catalog only if the products table is empty,
    so this is safe to call on every startup."""
    if db.query(Product).first() is not None:
        return

    for data in DEFAULT_PRODUCTS:
        db.add(Product(**data))
    db.commit()
