"use client"

import * as React from "react"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircle,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconLayoutColumns,
    IconPlus,
    IconSearch,
    IconX,
    IconCalendar,
    IconArrowUp,
    IconArrowDown,
} from "@tabler/icons-react"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { deleteUser, findUsersWithFilter, restoreUser } from "@/api"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { de } from "zod/v4/locales"
import { getSocket } from "@/lib/socket"

export const userSchema = z.object({
    _id: z.string(),
    email: z.string(),
    avatarUrl: z.string(),
    fullName: z.string(),
    username: z.string(),
    dateOfBirth: z.string(),
    bio: z.string(),
    status: z.object({
        isOnline: z.boolean(),
        lastActiveAt: z.string(),
    }),
    updatedAt: z.string(),
    _destroy: z.boolean(),
    createdAt: z.string(),
    __v: z.number(),
})

export type User = z.infer<typeof userSchema>

type PresenceUpdate = {
    userId: string;
    isOnline: boolean;
    lastActiveAt: string;
}

export function DataTable() {
    const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    })
    const [total, setTotal] = React.useState(0)
    const [data, setData] = React.useState<User[]>([])
    const [loading, setLoading] = React.useState(false)
    const [open, setOpen] = React.useState(false)
    const [selectedId, setSelectedId] = React.useState<string>("")

    // Socket.io presence updates
    React.useEffect(() => {
        if (!data.length) return
        const socket = getSocket()

        socket.on("presence:update", (presenceData) => {
            console.log("Received presence update:", presenceData)
            setData(prevData =>
                prevData.map(u =>
                    u._id === presenceData.userId
                        ? { ...u, status: { ...u.status, isOnline: presenceData.isOnline } }
                        : u
                )
            )
        })
    }, [data])

    // Filter states - chỉ là temporary values
    const [searchQuery, setSearchQuery] = React.useState("")
    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")

    // Applied filters - giá trị thực sự dùng để fetch
    const [appliedFilters, setAppliedFilters] = React.useState({
        search: "",
        startDate: "",
        endDate: "",
    })

    // Reset về trang đầu khi filters hoặc sorting thay đổi
    React.useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }, [appliedFilters, sorting])

    // Fetch data khi applied filters, sorting, hoặc pagination thay đổi
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const response = await findUsersWithFilter({
                    search: appliedFilters.search || undefined,
                    startDate: appliedFilters.startDate || undefined,
                    endDate: appliedFilters.endDate || undefined,
                    page: pagination.pageIndex + 1,
                    limit: pagination.pageSize,
                    sortBy: sorting[0]?.id,
                    sort: sorting[0]?.desc ? 'desc' : 'asc',
                })
                setData(response.users)
                setTotal(response.total)
            } catch (error) {
                console.error('Error fetching data:', error)
                setData([])
                setTotal(0)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [appliedFilters, sorting, pagination])

    const columns: ColumnDef<User>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "avatarUrl",
            header: "Avatar",
            cell: ({ row }) => (
                <Avatar>
                    <AvatarImage src={row.original.avatarUrl} />
                    <AvatarFallback>{row.original.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "fullName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        User
                        {column.getIsSorted() === "asc" ? (
                            <IconArrowUp className="ml-2 size-4" />
                        ) : column.getIsSorted() === "desc" ? (
                            <IconArrowDown className="ml-2 size-4" />
                        ) : null}
                    </Button>
                )
            },
            cell: ({ row }) => {
                return <div className="font-medium">{row.original.fullName}</div>
            },
            enableHiding: false,
        },
        {
            accessorKey: "email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Email
                        {column.getIsSorted() === "asc" ? (
                            <IconArrowUp className="ml-2 size-4" />
                        ) : column.getIsSorted() === "desc" ? (
                            <IconArrowDown className="ml-2 size-4" />
                        ) : null}
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.email}
                </div>
            ),
        },
        {
            accessorKey: "username",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Username
                        {column.getIsSorted() === "asc" ? (
                            <IconArrowUp className="ml-2 size-4" />
                        ) : column.getIsSorted() === "desc" ? (
                            <IconArrowDown className="ml-2 size-4" />
                        ) : null}
                    </Button>
                )
            },
            cell: ({ row }) => (
                <Badge variant="outline" className="text-muted-foreground px-1.5">
                    @{row.original.username}
                </Badge>
            ),
        },
        {
            accessorKey: "status.isOnline",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant="outline" className="text-muted-foreground px-1.5 gap-1">
                    {row.original.status.isOnline ? (
                        <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 size-3" />
                    ) : (
                        <IconCircle className="size-3" />
                    )}
                    {row.original.status.isOnline ? "Online" : "Offline"}
                </Badge>
            ),
        },
        {
            accessorKey: "dateOfBirth",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Date of Birth
                        {column.getIsSorted() === "asc" ? (
                            <IconArrowUp className="ml-2 size-4" />
                        ) : column.getIsSorted() === "desc" ? (
                            <IconArrowDown className="ml-2 size-4" />
                        ) : null}
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="text-sm">
                    {new Date(row.original.dateOfBirth).toLocaleDateString()}
                </div>
            ),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Created At
                        {column.getIsSorted() === "asc" ? (
                            <IconArrowUp className="ml-2 size-4" />
                        ) : column.getIsSorted() === "desc" ? (
                            <IconArrowDown className="ml-2 size-4" />
                        ) : null}
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="text-sm">
                    {new Date(row.original.createdAt).toLocaleDateString()}
                </div>
            ),
        },
        {
            accessorKey: "_destroy",
            header: "Deleted",
            cell: ({ row }) => {
                const isDeleted = row.original._destroy;

                return (
                    <Badge
                        variant={isDeleted ? "destructive" : "secondary"}
                        className={`px-2 py-0.5 ${isDeleted ? "opacity-90" : "text-muted-foreground"}`}
                    >
                        {isDeleted ? "Yes" : "No"}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                            size="icon"
                        >
                            <IconDotsVertical />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        {/* <DropdownMenuItem>Edit</DropdownMenuItem> */}
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        {/* <DropdownMenuItem>Send Message</DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        {row.original._destroy ? (
                            <DropdownMenuItem onClick={() => { setOpen(v => !v); setSelectedId(row.original._id) }} className="text-green-600 hover:text-green-700">
                                Restore User
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => { setOpen(v => !v); setSelectedId(row.original._id) }} className="text-red-600 hover:text-red-700">
                                Delete User
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ]

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
        pageCount: Math.ceil(total / pagination.pageSize),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        getRowId: (row) => row._id.toString(),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    const hasActiveFilters = appliedFilters.search || appliedFilters.startDate || appliedFilters.endDate

    const handleFind = () => {
        setAppliedFilters({
            search: searchQuery,
            startDate: startDate,
            endDate: endDate,
        })
    }

    const clearFilters = () => {
        setSearchQuery("")
        setStartDate("")
        setEndDate("")
        setAppliedFilters({
            search: "",
            startDate: "",
            endDate: "",
        })
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFind()
        }
    }

    const handleDeleteUsers = async () => {
        await deleteUser(selectedId)
        // Refresh data
        handleFind()
    }

    const handleRestoreUsers = async () => {
        await restoreUser(selectedId)
        // Refresh data
        handleFind()
    }

    return (
        <Tabs
            defaultValue="outline"
            className="w-full flex-col justify-start gap-6"
        >
            <div className="flex items-center justify-between px-4 lg:px-6">
                <Label htmlFor="view-selector" className="sr-only">
                    View
                </Label>
                <Select defaultValue="outline">
                    <SelectTrigger
                        className="flex w-fit @4xl/main:hidden"
                        size="sm"
                        id="view-selector"
                    >
                        <SelectValue placeholder="Select a view" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="outline">Outline</SelectItem>
                        {/* <SelectItem value="past-performance">Past Performance</SelectItem>
                        <SelectItem value="key-personnel">Key Personnel</SelectItem>
                        <SelectItem value="focus-documents">Focus Documents</SelectItem> */}
                    </SelectContent>
                </Select>
                <TabsList className="hidden @4xl/main:flex">
                    <TabsTrigger value="outline">User Statistics</TabsTrigger>
                    {/* <TabsTrigger value="past-performance">
                        Past Performance <Badge variant="secondary">3</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="key-personnel">
                        Key Personnel <Badge variant="secondary">2</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger> */}
                </TabsList>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <IconLayoutColumns />
                                <span className="hidden lg:inline">Customize Columns</span>
                                <span className="lg:hidden">Columns</span>
                                <IconChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {table
                                .getAllColumns()
                                .filter(
                                    (column) =>
                                        typeof column.accessorFn !== "undefined" &&
                                        column.getCanHide()
                                )
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm">
                        <IconPlus />
                        <span className="hidden lg:inline">Add Section</span>
                    </Button>
                </div>
            </div>
            <TabsContent
                value="outline"
                className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
            >
                {/* Filter Section */}
                <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Filters</h3>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-8 text-xs"
                            >
                                <IconX className="mr-1 size-3" />
                                Clear all
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Search Input */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="search" className="text-xs">
                                Search
                            </Label>
                            <div className="relative">
                                <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Start Date */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="startDate" className="text-xs">
                                Start Date
                            </Label>
                            <div className="relative">
                                <IconCalendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="endDate" className="text-xs">
                                End Date
                            </Label>
                            <div className="relative">
                                <IconCalendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Find Button */}
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs opacity-0">Action</Label>
                            <Button
                                onClick={handleFind}
                                className="w-full"
                            >
                                <IconSearch className="mr-2 size-4" />
                                Find
                            </Button>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2">
                            {appliedFilters.search && (
                                <Badge variant="secondary" className="gap-1">
                                    Search: {appliedFilters.search}
                                    <button
                                        onClick={() => {
                                            setSearchQuery("")
                                            setAppliedFilters(prev => ({ ...prev, search: "" }))
                                        }}
                                        className="ml-1 hover:bg-muted rounded-full"
                                    >
                                        <IconX className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            {appliedFilters.startDate && (
                                <Badge variant="secondary" className="gap-1">
                                    From: {new Date(appliedFilters.startDate).toLocaleDateString()}
                                    <button
                                        onClick={() => {
                                            setStartDate("")
                                            setAppliedFilters(prev => ({ ...prev, startDate: "" }))
                                        }}
                                        className="ml-1 hover:bg-muted rounded-full"
                                    >
                                        <IconX className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            {appliedFilters.endDate && (
                                <Badge variant="secondary" className="gap-1">
                                    To: {new Date(appliedFilters.endDate).toLocaleDateString()}
                                    <button
                                        onClick={() => {
                                            setEndDate("")
                                            setAppliedFilters(prev => ({ ...prev, endDate: "" }))
                                        }}
                                        className="ml-1 hover:bg-muted rounded-full"
                                    >
                                        <IconX className="size-3" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} colSpan={header.colSpan}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            Loading...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No results found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                        {Object.keys(rowSelection).length} of{" "}
                        {total} row(s) selected.
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue
                                        placeholder={table.getState().pagination.pageSize}
                                    />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount() || 1}
                        </div>
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to first page</span>
                                <IconChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <IconChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <IconChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to last page</span>
                                <IconChevronsRight />
                            </Button>
                        </div>
                    </div>
                </div>

                <ConfirmActionDialog
                    actionType={data.find(user => user._id === selectedId && !user._destroy) ? "delete" : "restore"}
                    open={open}
                    setOpen={setOpen}
                    onConfirm={() => {
                        if (data.find(user => user._id === selectedId && !user._destroy)) {
                            handleDeleteUsers()
                        } else {
                            handleRestoreUsers()
                        }
                    }}
                />
            </TabsContent>
            <TabsContent
                value="past-performance"
                className="flex flex-col px-4 lg:px-6"
            >
                <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
            </TabsContent>
            <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
                <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
            </TabsContent>
            <TabsContent
                value="focus-documents"
                className="flex flex-col px-4 lg:px-6"
            >
                <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
            </TabsContent>
        </Tabs>
    )
}

// components hiện thông báo bạn có chắc chắn muốn xóa hoặc muốn restore không dùng dialog shadcn
// Reusable Dialog Components
type ConfirmActionDialogProps = {
    actionType: "delete" | "restore"
    onConfirm?: () => void
    open: boolean
    setOpen: (open: boolean) => void
}

export function ConfirmActionDialog({
    actionType,
    onConfirm,
    open,
    setOpen,
}: ConfirmActionDialogProps) {
    const handleConfirm = () => {
        if (onConfirm) onConfirm()
        setOpen(false)
    }

    const isDelete = actionType === "delete"
    const iconColor = isDelete ? "text-red-500" : "text-green-500"
    const icon = isDelete ? (
        <AlertTriangle className={`h-8 w-8 ${iconColor}`} />
    ) : (
        <RotateCcw className={`h-8 w-8 ${iconColor}`} />
    )

    const title = isDelete
        ? "Are you absolutely sure you want to delete?"
        : "Are you sure you want to restore this item?"

    const description = isDelete
        ? "This action cannot be undone. This will permanently delete your account and remove your data from our servers."
        : "This will restore the item and make it visible or usable again."

    const confirmButtonText = isDelete ? "Delete" : "Restore"
    const confirmButtonVariant = isDelete ? "destructive" : "default"

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="text-center">
                    <div className="flex justify-center mb-3">{icon}</div>
                    <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                    <DialogDescription className="text-gray-500 text-sm">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-5 flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant={confirmButtonVariant} onClick={handleConfirm}>
                        {confirmButtonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}