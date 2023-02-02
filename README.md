## Remote Resource Toolkit

Simple React hooks to avoid redux boilerplate and fetching remote data. Fetched data is cached in redux.

Most of the React projects I worked on use redux as a state management solution.  Even with the recommended Redux toolkit I noticed repetitive codes while  writing redux logic for different portion of the application.

I thought of developing a common react hook which sums up most of the actions that performed on a state slice. So that I can avoid writing slice for different remote data in project

The idea is to have a common redux slice, say, remoteResource and other slices will be added/removed dynamically under it.

## What is Remote resource?
This hook view a remote resource as a combination of two things, `resource data` and `parameters(query params + request body)`. So all remote resource under redux structured as below:

```
interface RemoteResource<ResourceType,ResourceParams> {
  status: ApiCallStatus;
  resource?: ResourceType;
  resourceKey?: string;
  resourceParams?: ResourceParams;
  message?: string;
}
```
The above structure get added/removed under `state.remoteResource` when `useRemoteResource` called.

## How to use

### Add the common slice to the store
```typescript
import {remoteResourceReducer} from '@cksutils/remote-resource-toolkit';

export const store = configureStore({
  reducer: {
    remoteResource: remoteResourceReducer,
  },
});
```
That's it no need to create any slice in the application, instead use `useRemoteResource` to load data.

### Create your own hooks using `useRemoteResource` for loading a specific type of resource.

Say, we want to load `products` from api `/api/products`. `sortByColumn` product name and `perPage` 20 items

```typescript
import {ResourceLoaderFn} from '@cksutils/remote-resource-toolkit';

// ResourceType, which is taken as items and totalCount
type ProductList = { items: ProductModel[]; totalCount: number };

// This Resource params
const deafultQueryParams: ResourceFilters = {
  page: 1,
  perPage: 20,
  sortByColumn: 'name',
  sortOrder: 'asc',
};

/**
 * We have to provide a resource loader function.
 * It takes below argument
 * args: {
 *   params: Partial<Params>;
 *   abortSignal?: AbortSignal;
 *  }
 * abortsignal to abort the network call if component unmounts before response
 * and return type is 
 * Promise<{ success: boolean; data?: ResourceType; params?: Params; message?: string }>;
 **/
const resourceLoader: ResourceLoaderFn<ProductList, ResourceFilters> = async (args) => {
  try {
    const { data } = await axios.get('/api/products', {
      params: {
        ...deafultQueryParams,
        ...args.params,
      },
      signal: args?.abortSignal,
    });
    return {
      success: data.success,
      data: {
        items: data?.data?.products,
        totalCount: data?.data?.total_count,
      },
      message: data?.message,
    };
  } catch (e) {
    return { success: false };
  }
};

const useProductList = (params: { autoLoad?: boolean; autoRemove?: boolean } = EMPTY_OBJECT) => {
  const {
    status,
    resource,
    resourceParams = deafultQueryParams,
    loadData,
  } = useRemoteResource<ProductList, ResourceFilters>({
    resourceName: 'products',// this string will be used to add in redux, so data will be available at state.remoteResource.products
    autoLoad: params.autoLoad, // whether to load data on mount
    autoRemove: params.autoRemove, // whether to remove from redux on unmount
    resourceLoader, // the resource loader function
  });

  // Compose some custom methods from the useRemoteResource
  const moveToPage = async (page: number) => {
    return loadData({ page });
  };

  const searchProduct = (searchText: string) => loadData({ searchText });

  return {
    isLoading: status === 'IN_PROGRESS',
    status,
    items: resource?.items || EMPTY_ARRAY,
    totalCount: resource?.totalCount || 0,
    filters: resourceParams,
    loadProducts: loadData,
    refreshData: loadData,
    moveToPage,
    searchProduct,
  };
};

export default useProductList;
```


### Use the customHook to load product data anywhere

```typescript
// ProductList.tsx
import useProductList from './useProductList';

export function productList(){
    const {isLoading, items,filters, moveToPage } = useProductList({autoLoad: true});

    return(
        <table>
         <tr><th>Name</th><th>Price</th></tr>
         {item.map(product=>(<tr>
          <td>{product.name}</td>
          <td>product.price</td>
         </tr>)}
        </table>
    )
}
```