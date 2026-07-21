from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_permission
from ..models import Product, User
from ..schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(tags=["products"])


@router.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    """Public: active products only, for the marketplace page."""
    products = (
        db.query(Product)
        .filter(Product.is_active.is_(True))
        .order_by(Product.sort_order.asc(), Product.created_at.asc())
        .all()
    )
    return products


@router.get("/admin/products", response_model=list[ProductOut])
def list_all_products(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("manage_products")),
):
    """Admin: every product, including inactive ones."""
    products = db.query(Product).order_by(Product.sort_order.asc(), Product.created_at.asc()).all()
    return products


@router.post("/admin/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("manage_products")),
):
    if db.query(Product).filter(Product.id == payload.id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A product with this ID already exists.")

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/admin/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("manage_products")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/admin/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("manage_products")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    db.delete(product)
    db.commit()
