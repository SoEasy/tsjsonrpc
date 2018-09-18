import {
  IJsonRpcMethodConfig,
  IJsonRpcRequest,
  IJsonRpcServiceConfig
} from "./interfaces";
import { guid } from './utils/guid';
import { stripSlash } from './utils/strip-slash';

const executeSymbol = Symbol('execute');

export class TSJsonRpc {
  private static getParamsObj(method: string, params?: object): IJsonRpcRequest {
    const retVal: IJsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      id: guid()
    };
    if (params) {
      retVal.params = params;
    }

    return retVal;
  }

  private static makeUrl(apiServerUrl?: string, endpoint?: string): string {
    return [
      apiServerUrl ? stripSlash(apiServerUrl) : void 0,
      endpoint ? stripSlash(endpoint) : void 0
    ].filter(v => !!v).join('/');
  }

  static makeClassDecorator(config: IJsonRpcServiceConfig): (endpoint?: string) => any {
    const { httpClient, apiServerUrl } = config;

    return (endpoint?: string): any => {
      return (target: any): void => {
        // tslint:disable-next-line
        target[executeSymbol] = function(method: string, data: object) {
          const { makeUrl } = TSJsonRpc;
          const apiUrl: string = makeUrl(apiServerUrl, endpoint);

          return httpClient.post(apiUrl, TSJsonRpc.getParamsObj(method, data));
        };
      };
    }
  }

  static makeMethodDecorator<TRequest, TConfigPayload>(
    requestPreprocessor: (request: TRequest) => any,
    responsePostprocessor: (response: any, config: TConfigPayload) => any
  ): (config: IJsonRpcMethodConfig<TConfigPayload>) => any {
    return (config: IJsonRpcMethodConfig<TConfigPayload>) => {
      return (target: any, propertyKey: string | Symbol, descriptor: TypedPropertyDescriptor<any>) => {
        // Декоратор метода работает раньше декоратора конструктора, поэтому execute будем получать в рантайме
        const targetConstructor = typeof target === 'function' ? target : target.constructor;

        // tslint:disable-next-line
        descriptor.value = function (request: TRequest) {
          return responsePostprocessor(
            targetConstructor[executeSymbol](config.method, requestPreprocessor(request)),
            config
          );
        };

        return descriptor;
      }
    }
  }
}
