import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import { AppDispatch, GetStateFn } from 'app/store';
import { EMPTY_OBJECT } from 'common/constants';

import {
  defaultRemoteResourceState,
  RemoteResource,
  remoteResourceActions,
  ResourceParams,
} from './remoteResourceSlice';

export type ResourceLoaderFn<
  ResourceType,
  Params extends ResourceParams = ResourceParams,
> = (args: { params: Partial<Params>; abortSignal?: AbortSignal }) => Promise<{
  success: boolean;
  data?: ResourceType;
  params?: Params;
  message?: string;
}>;

export interface UseRemoteResourceParams<
  ResourceType,
  Params extends ResourceParams = ResourceParams,
> {
  resourceName: string;
  resourceKey?: string;
  autoLoad?: boolean;
  autoLoadParams?: Partial<Params>;
  autoRemove?: boolean;
  disconnected?: boolean;
  resourceLoader: ResourceLoaderFn<ResourceType, Params>;
}

interface ThunkParams<
  ResourceType,
  Params extends ResourceParams = ResourceParams,
> {
  resourceName: string;
  resourceKey?: string;
  resourceParams: Partial<Params>;
  resourceLoader: UseRemoteResourceParams<
    ResourceType,
    Params
  >['resourceLoader'];
  abortSignal?: AbortSignal;
}

const initialLoadThunk = <
  ResourceType,
  Params extends ResourceParams = ResourceParams,
>(
  params: ThunkParams<ResourceType, Params>,
) => {
  return async (dispatch: AppDispatch, getState: GetStateFn) => {
    const { resourceName, abortSignal } = params;
    const resourceState = getState().remoteResource;
    const resourceStatus = resourceState?.[resourceName]?.status || 'INIT';
    const currentResourceKey = resourceState?.[resourceName]?.resourceKey;

    if (abortSignal && abortSignal.aborted) {
      return;
    }
    if (
      resourceStatus === 'INIT' ||
      (params?.resourceKey && params.resourceKey !== currentResourceKey)
    ) {
      dispatch(loadResourceThunk(params));
    }
  };
};

const loadResourceThunk = <
  ResourceType,
  Params extends ResourceParams = ResourceParams,
>(
  params: ThunkParams<ResourceType, Params>,
) => {
  return async (dispatch: AppDispatch, getState: GetStateFn) => {
    const {
      resourceName,
      resourceParams,
      resourceKey,
      resourceLoader,
      abortSignal,
    } = params;

    const resourceStatus =
      getState().remoteResource?.[resourceName]?.status || 'INIT';
    if (resourceStatus === 'IN_PROGRESS') {
      return;
    }

    if (abortSignal && abortSignal.aborted) {
      return;
    }

    try {
      dispatch(
        remoteResourceActions.setStatus({
          resourceName,
          status: 'IN_PROGRESS',
        }),
      );
      const { success, data, params, message } = await resourceLoader({
        params: resourceParams,
        abortSignal,
      });
      if (abortSignal && abortSignal.aborted) {
        // do nothing
      } else {
        const nextState: RemoteResource<ResourceType, Params> = {
          status: success ? 'SUCCESS' : 'ERROR',
          resource: data,
          resourceKey,
          resourceParams: params,
          message,
        };
        dispatch(
          remoteResourceActions.setState({
            resourceName,
            resourceState: nextState,
          }),
        );
      }
    } catch (e) {
      dispatch(
        remoteResourceActions.setState({
          resourceName,
          resourceState: {
            status: 'ERROR',
            message: 'Some error occured during loading data.',
          },
        }),
      );
    }
  };
};

const constantSelector = () => defaultRemoteResourceState;

export function useRemoteResource<
  ResourceType,
  Params extends ResourceParams = ResourceParams,
>(params: UseRemoteResourceParams<ResourceType, Params>) {
  const {
    resourceName,
    resourceKey,
    autoLoad = false,
    autoLoadParams = EMPTY_OBJECT,
    autoRemove = false,
    disconnected = false,
    resourceLoader,
  } = params;
  const dispatch = useAppDispatch();
  const abortRef = useRef(new AbortController());

  const slice = useAppSelector(
    disconnected
      ? constantSelector
      : (state) =>
          state.remoteResource?.[resourceName] || defaultRemoteResourceState,
  ) as RemoteResource<ResourceType, Params>;

  useEffect(() => {
    if (autoLoad) {
      abortRef.current = new AbortController();
      dispatch(
        initialLoadThunk({
          resourceName,
          resourceKey,
          resourceParams: autoLoadParams,
          resourceLoader,
          abortSignal: abortRef.current.signal,
        }),
      );
    }
  }, [
    autoLoad,
    autoLoadParams,
    resourceName,
    resourceKey,
    dispatch,
    resourceLoader,
  ]);

  useEffect(() => {
    if (autoLoad) {
      return () => {
        abortRef.current.abort('Unmount');
        dispatch(remoteResourceActions.abort({ resourceName }));
      };
    }
  }, [autoLoad, resourceName, dispatch]);

  useEffect(() => {
    return () => {
      if (autoRemove) {
        dispatch(remoteResourceActions.removeState({ resourceName }));
      }
    };
  }, [dispatch, autoRemove, resourceName]);

  const loadData = async (resourceParams: Partial<Params> = EMPTY_OBJECT) => {
    dispatch(
      loadResourceThunk({ resourceName, resourceParams, resourceLoader }),
    );
  };

  return {
    ...slice,
    loadData,
  };
}

export default useRemoteResource;
