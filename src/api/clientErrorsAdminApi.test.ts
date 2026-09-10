import { beforeEach,describe,expect,it,vi } from "vitest";
import { clientErrorsAdminApi } from "./clientErrorsAdminApi";
const mocks=vi.hoisted(()=>({apiRequest:vi.fn()}));
vi.mock("./client",()=>({apiRequest:mocks.apiRequest}));
describe("clientErrorsAdminApi",()=>{beforeEach(()=>mocks.apiRequest.mockReset());
 it("uses completed list requests and normalizes pagination",async()=>{mocks.apiRequest.mockResolvedValue({data:[{_id:"e1",status:"new"}],currentPage:2,totalCount:45,totalPages:3});const result=await clientErrorsAdminApi.list({page:2,limit:20,search:"teacher@example.com",status:"new"});expect(mocks.apiRequest).toHaveBeenCalledWith(expect.stringContaining("page=2&limit=20&search=teacher%40example.com&status=new"));expect(result).toMatchObject({page:2,total:45,totalPages:3,hasNextPage:true,data:[{id:"e1",status:"new"}]})});
 it("gets details and patches status",async()=>{mocks.apiRequest.mockResolvedValueOnce({data:{id:"e1",status:"new"}}).mockResolvedValueOnce({data:{id:"e1",status:"resolved"}});await clientErrorsAdminApi.get("e1");await clientErrorsAdminApi.updateStatus("e1","resolved");expect(mocks.apiRequest).toHaveBeenLastCalledWith("/admin/client-errors/e1/status",{method:"PATCH",body:JSON.stringify({status:"resolved"})})});
});
