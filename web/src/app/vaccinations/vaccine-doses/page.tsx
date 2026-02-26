'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal, Select, Flex, Grid } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineType {
  id: string;
  name: string;
}

const fetchVaccineTypes = async (): Promise<VaccineType[]> => {
  const response = await fetch(`${API_URL}/vaccine-types/all/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

interface VaccineDose {
  id: number;
  vaccine_type: string | { id: string; name: string };
  vaccine_type_name: string;
  patient: number | { id: number; name: string };
  patient_name: string;
  dose_date: string;
  expiration_date: string;
  clinic: number | null;
  clinic_name_display: string | null;
  veterinarian: number | null;
  veterinarian_name_display: string | null;
  notes: string | null;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
  total_pages: number;
  results: T[];
}

const fetchVaccineDoses = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string,
  isLatest?: boolean,
  expiresBefore?: string,
  vaccineTypeId?: string
): Promise<PaginatedResponse<VaccineDose>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  if (ordering) {
    params.append('ordering', ordering);
  }
  // Only send is_latest when filtering to latest; omit when "All doses" to get both latest and non-latest
  if (isLatest === true) {
    params.append('is_latest', 'true');
  }
  if (expiresBefore) {
    params.append('expires_before', expiresBefore);
  }
  if (vaccineTypeId) {
    params.append('vaccine_type', vaccineTypeId);
  }

  const response = await fetch(`${API_URL}/vaccine-doses/?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.results && typeof data.count === 'number') {
    return data;
  }
  return {
    count: Array.isArray(data) ? data.length : 0,
    next: null,
    previous: null,
    page_size: pageSize,
    current_page: 1,
    total_pages: 1,
    results: Array.isArray(data) ? data : [],
  };
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function VaccineDosesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchText, setSearchText] = useState(() => searchParams?.get('search') ?? '');
  const [debouncedSearchText, setDebouncedSearchText] = useState(() => searchParams?.get('search') ?? '');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(() => searchParams?.get('sort') ?? undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(() => {
    const o = searchParams?.get('order');
    return o === 'desc' ? 'descend' : o === 'asc' ? 'ascend' : undefined;
  });
  const [isLatest, setIsLatest] = useState<boolean>(() => {
    const param = searchParams?.get('is_latest');
    if (param === 'true') return true;
    if (param === 'false' || param === 'all') return false;
    return true;
  });
  const [expiresBefore, setExpiresBefore] = useState<string>(() => searchParams?.get('expires_before') ?? '');
  const [debouncedExpiresBefore, setDebouncedExpiresBefore] = useState<string>(() => searchParams?.get('expires_before') ?? '');
  const [vaccineTypeId, setVaccineTypeId] = useState<string | undefined>(() => searchParams?.get('vaccine_type') ?? undefined);
  const queryClient = useQueryClient();

  const { data: vaccineTypes = [] } = useQuery({
    queryKey: ['vaccine_types_all'],
    queryFn: fetchVaccineTypes,
  });

  // Sync filters/sort from URL when user navigates (e.g. back/forward)
  useEffect(() => {
    const s = searchParams?.get('sort');
    const o = searchParams?.get('order');
    setSortField(s ?? undefined);
    setSortOrder(o === 'desc' ? 'descend' : o === 'asc' ? 'ascend' : undefined);

    const nextSearch = searchParams?.get('search') ?? '';
    if (nextSearch !== searchText) setSearchText(nextSearch);

    const nextIsLatestParam = searchParams?.get('is_latest');
    const nextIsLatest =
      nextIsLatestParam === 'true'
        ? true
        : nextIsLatestParam === 'false' || nextIsLatestParam === 'all'
          ? false
          : true;
    if (nextIsLatest !== isLatest) setIsLatest(nextIsLatest);

    const nextExpiresBefore = searchParams?.get('expires_before') ?? '';
    if (nextExpiresBefore !== expiresBefore) setExpiresBefore(nextExpiresBefore);

    const nextVaccineTypeId = searchParams?.get('vaccine_type') ?? undefined;
    if (nextVaccineTypeId !== vaccineTypeId) setVaccineTypeId(nextVaccineTypeId);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExpiresBefore(expiresBefore);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [expiresBefore]);

  // Keep filters in the URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (debouncedSearchText) {
      params.set('search', debouncedSearchText);
    } else {
      params.delete('search');
    }
    if (isLatest) {
      params.set('is_latest', 'true');
    } else {
      params.set('is_latest', 'all');
    }
    if (expiresBefore) {
      params.set('expires_before', expiresBefore);
    } else {
      params.delete('expires_before');
    }
    if (vaccineTypeId) {
      params.set('vaccine_type', vaccineTypeId);
    } else {
      params.delete('vaccine_type');
    }
    const qs = params.toString();
    const base = pathname ?? '';
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  }, [debouncedSearchText, isLatest, expiresBefore, vaccineTypeId, pathname, router, searchParams]);

  const ordering = useMemo(() => {
    if (!sortField) return undefined;
    const prefix = sortOrder === 'descend' ? '-' : '';
    const fieldMap: Record<string, string> = {
      patient_name: 'patient__name',
      vaccine_type_name: 'vaccine_type__name',
      dose_date: 'dose_date',
      expiration_date: 'expiration_date',
    };
    const apiField = fieldMap[sortField] ?? sortField;
    return `${prefix}${apiField}`;
  }, [sortField, sortOrder]);

  const {
    data: paginatedData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vaccine_doses', currentPage, pageSize, debouncedSearchText, ordering, isLatest, debouncedExpiresBefore || null, vaccineTypeId || null],
    queryFn: () => fetchVaccineDoses(
      currentPage,
      pageSize,
      debouncedSearchText || undefined,
      ordering,
      isLatest,
      debouncedExpiresBefore || undefined,
      vaccineTypeId
    ),
    placeholderData: (previousData) => previousData,
  });

  const vaccineDoses = (paginatedData?.results ?? []) as VaccineDose[];

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<VaccineDose> | SorterResult<VaccineDose>[]
  ) => {
    // Pagination is handled by pagination.onChange below to avoid overwriting page when both fire
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.field) {
      setSortField(single.field as string);
      setSortOrder(single.order ?? undefined);
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('sort', String(single.field));
      if (single.order) {
        params.set('order', single.order === 'descend' ? 'desc' : 'asc');
      } else {
        params.delete('order');
      }
      router.replace(`${pathname ?? ''}?${params.toString()}`, { scroll: false });
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('sort');
      params.delete('order');
      const qs = params.toString();
      const base = pathname ?? '';
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/vaccine-doses/${id}/`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_doses'] });
      Modal.success({ content: 'Vaccine dose deleted successfully' });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting vaccine dose',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (vaccineDose: VaccineDose) => {
    Modal.confirm({
      title: 'Delete Vaccine Dose',
      content: (
        <div>
          <p>Are you sure you want to delete this vaccine dose?</p>
          <p><strong>Patient:</strong> {vaccineDose.patient_name}</p>
          <p><strong>Vaccine:</strong> {vaccineDose.vaccine_type_name}</p>
          <p><strong>Dose Date:</strong> {formatDate(vaccineDose.dose_date)}</p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMutation.mutate(vaccineDose.id);
      },
    });
  };

  const columns: ColumnsType<VaccineDose> = useMemo(
    () => [
      {
        title: 'Patient',
        dataIndex: 'patient_name',
        key: 'patient_name',
        sorter: true,
        fixed: 'left',
        sortOrder: sortField === 'patient_name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
        render: (name: string, record: VaccineDose) => {
          const patientId = typeof record.patient === 'object' ? record.patient?.id : record.patient;
          if (patientId) {
            return (
              <span
                onClick={() => router.push(`/patients/${patientId}`)}
                style={{ cursor: 'pointer' }}
              >
                {name}
              </span>
            );
          }
          return name;
        },
      },
      {
        title: 'Vaccine',
        dataIndex: 'vaccine_type_name',
        key: 'vaccine_type_name',
        sorter: true,
        sortOrder: sortField === 'vaccine_type_name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Dose Date',
        dataIndex: 'dose_date',
        key: 'dose_date',
        render: (date: string) => formatDate(date),
        sorter: true,
        sortOrder: sortField === 'dose_date' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Expiration',
        dataIndex: 'expiration_date',
        key: 'expiration_date',
        render: (date: string) => formatDate(date),
        sorter: true,
        sortOrder: sortField === 'expiration_date' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Clinic',
        dataIndex: 'clinic_name_display',
        key: 'clinic',
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Veterinarian',
        dataIndex: 'veterinarian_name_display',
        key: 'veterinarian',
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        render: (_: unknown, record: VaccineDose) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/vaccinations/vaccine-doses/${record.id}`)}
              title="Edit"
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={deleteMutation.isPending}
              title="Delete"
            />
          </Space>
        ),
      },
    ],
    [sortField, sortOrder, router]
  );

  if (isLoading) return <Spin size="large" />;

  if (error) return (
    <Alert
      message="Error fetching vaccine doses"
      description={error instanceof Error ? error.message : 'Unknown error'}
      type="error"
      showIcon
    />
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Vaccine Doses</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/vaccinations/vaccine-doses/new')}
        >
          Record New Dose
        </Button>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Flex gap="middle" wrap="wrap" align="center">
          <Input
            placeholder="Search by patient, vaccine, clinic, veterinarian, or notes..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
          <Select
            value={vaccineTypeId ?? undefined}
            onChange={(v) => { setVaccineTypeId(v ?? undefined); setCurrentPage(1); }}
            placeholder="All vaccine types"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            style={{ minWidth: 160 }}
            options={vaccineTypes.map((vt) => ({ value: vt.id, label: vt.name }))}
          />
          <Select
            value={isLatest}
            onChange={(v) => { setIsLatest(v); setCurrentPage(1); }}
            style={{ minWidth: 140 }}
            options={[
              { value: true, label: 'Latest only' },
              { value: false, label: 'All doses' },
            ]}
          />
          <Space>
            <span>Expires before:</span>
            <Input
              type="date"
              value={expiresBefore}
              onChange={(e) => setExpiresBefore(e.target.value)}
              allowClear
              style={{ width: 160 }}
            />
          </Space>
        </Flex>
        <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible' }}>
          <Table
            dataSource={vaccineDoses}
            columns={columns}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total: paginatedData?.count ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} vaccine doses`,
              onChange: (page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== undefined && newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              },
            }}
            scroll={isMobile ? { x: 'max-content' } : undefined}
            bordered
          />
        </div>
      </Space>
    </div>
  );
}

