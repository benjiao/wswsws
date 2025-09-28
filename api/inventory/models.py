from django.db import models

# Create your models here.
class Medicine(models.Model):
    name = models.CharField(max_length=255)
    STOCK_STATUS_CHOICES = (
        (0, 'Out of Stock'),
        (1, 'Low Stock'),
        (2, 'In Stock'),
    )
    stock_status = models.IntegerField(choices=STOCK_STATUS_CHOICES, default=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
