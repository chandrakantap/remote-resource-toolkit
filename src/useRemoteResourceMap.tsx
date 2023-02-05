import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { AppDispatch, GetStateFn } from './store';
import { EMPTY_OBJECT } from './constants';

import {
  defaultRemoteResourceState,
  RemoteResource,
  remoteResourceMapActions,
} from './remoteResourceMapSlice';
import { ResourceParams } from './remoteResourceMapSlice';

interface UseResourceMapParams<ResourceType, Params> {
  resourceName: string;
  resourceKey: string;
  autoLoad?: boolean;
  autoLoadParams?: Partial<Params>;
  autoRemove?: boolean;
  resourceLoader: (
    resourceKey: string,
    params: Partial<Params>
  ) => Promise<{ success: boolean; data?: ResourceType; params?: Params; message?: string }>;
}

interface ThunkParams<ResourceType, Params> {
  resourceName: string;
  resourceKey: string;
  resourceParams: Partial<Params>;
  resourceLoader: UseResourceMapParams<ResourceType, Params>['resourceLoader'];
  abortSignal?: AbortSignal;
}

const initialLoadThunk = <ResourceType, Params extends ResourceParams = ResourceParams>(
  params: ThunkParams<ResourceType, Params>
) => {
  return async (dispatch: AppDispatch, getState: GetStateFn) => {
    const { resourceName, resourceKey, abortSignal } = params;
    const remoteResourceState = getState().remoteResourceMap;
    const resourceStatus = remoteResourceState?.[resourceName]?.[resourceKey]?.status || 'INIT';
    if (abortSignal && abortSignal.aborted) {
      return;
    }
    if (resourceStatus === 'INIT') {
      dispatch(loadResourceThunk(params));
    }
  };
};

const loadResourceThunk = <ResourceType, Params extends ResourceParams = ResourceParams>(
  params: ThunkParams<ResourceType, Params>
) => {
  return async (dispatch: AppDispatch, getState: GetStateFn) => {
    const { resourceName, resourceKey, resourceParams, resourceLoader, abortSignal } = params;
    const remoteResourceState = getState().remoteResourceMap;
    const resourceStatus = remoteResourceState?.[resourceName]?.[resourceKey]?.status || 'INIT';
    if (resourceStatus === 'IN_PROGRESS') {
      return;
    }
    if (abortSignal && abortSignal.aborted) {
      return;
    }

    try {
      dispatch(
        remoteResourceMapActions.setStatus({ resourceName, resourceKey, status: 'IN_PROGRESS' })
      );
      const { success, data, params, message } = await resourceLoader(resourceKey, resourceParams);
      const nextState: RemoteResource<ResourceType, Params> = {
        status: success ? 'SUCCESS' : 'ERROR',
        resource: data,
        params,
        message,
      };
      dispatch(
        remoteResourceMapActions.setState({ resourceName, resourceKey, resourceState: nextState })
      );
    } catch (e) {
      dispatch(
        remoteResourceMapActions.setState({
          resourceName,
          resourceKey,
          resourceState: {
            status: 'ERROR',
            message: 'Some error occured during loading data.',
          },
        })
      );
    }
  };
};

function useResourceMap<ResourceType, Params extends ResourceParams = ResourceParams>(
  params: UseResourceMapParams<ResourceType, Params>
) {
  const {
    resourceName,
    resourceKey,
    autoLoad = false,
    autoLoadParams = EMPTY_OBJECT,
    autoRemove = false,
    resourceLoader,
  } = params;
  const dispatch = useAppDispatch();
  const abortRef = useRef(new AbortController());

  const slice = useAppSelector(
    (state) => state.remoteResourceMap?.[resourceName]?.[resourceKey] || defaultRemoteResourceState
  );

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
        })
      );
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      return () => {
        abortRef.current.abort('Unmount');
        dispatch(remoteResourceMapActions.abort({ resourceName, resourceKey }));
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      if (autoRemove) {
        dispatch(remoteResourceMapActions.removeState({ resourceName, resourceKey }));
      }
    };
  }, [dispatch, autoRemove, resourceName]);

  const loadData = async (resourceParams: Partial<Params> = EMPTY_OBJECT) => {
    dispatch(loadResourceThunk({ resourceName, resourceKey, resourceParams, resourceLoader }));
  };

  return {
    ...slice,
    loadData,
  };
}

export default useResourceMap;
