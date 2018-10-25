import {
  IHttpClient,
  IJsonRpcMethodConfig,
  IJsonRpcRequest,
  IJsonRpcServiceConfig
} from "./interfaces";
import { guid } from './utils/guid';
import { stripEndingSlash, stripStarterSlash } from './utils/strip-slash';

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
      apiServerUrl ? stripEndingSlash(apiServerUrl) : void 0,
      endpoint ? stripStarterSlash(endpoint) : void 0
    ].filter(v => !!v).join('/');
  }

  static makeClassDecorator(config: IJsonRpcServiceConfig): (endpoint?: string) => any {
    const { httpClient, apiServerUrl } = config;

    return (endpoint?: string): any => {
      return (target: any): void => {
        target['apiUrl'] = TSJsonRpc.makeUrl(apiServerUrl, endpoint);

        target['requestBody'] = (method: string, data: object) => {
          return TSJsonRpc.getParamsObj(method, data);
        };

        target['httpClient'] = httpClient;
      }
    }
  }

  static makeMethodDecorator<TRequest, TConfigPayload>(
    requestPreprocessor: (request: TRequest) => any,
    responsePostprocessor: (response: any, config: TConfigPayload) => any,
    transportFactory?: () => IHttpClient
  ): (config: IJsonRpcMethodConfig<TConfigPayload>) => any {
    return (config: IJsonRpcMethodConfig<TConfigPayload>) => {
      return (target: any, propertyKey: string | Symbol, descriptor: TypedPropertyDescriptor<any>) => {
        // Декоратор метода работает раньше декоратора конструктора, поэтому execute будем получать в рантайме
        const targetConstructor = typeof target === 'function' ? target : target.constructor;

        // tslint:disable-next-line
        descriptor.value = function(request: TRequest) {
          const apiUrl = targetConstructor['apiUrl'] || config.method;

          const requestBody = targetConstructor['requestBody'] ?
                              targetConstructor['requestBody'](config.method, requestPreprocessor(request)) :
                              requestPreprocessor(request);

          const transport = transportFactory ? transportFactory() : targetConstructor['httpClient'];

          if (!transport) throw Error('There is no http client presented');

          return responsePostprocessor(
            transport.post(apiUrl, requestBody),
            config
          );
        };

        return descriptor;
      }
    }
  }
}
