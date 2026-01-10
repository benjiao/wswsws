from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Custom pagination class that always includes pagination metadata.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
    
    def get_paginated_response(self, data):
        """
        Return a paginated style Response object with pagination metadata.
        """
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_size': self.page.paginator.per_page,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })
