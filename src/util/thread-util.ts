export class ThreadUtil
{
    public static Sleep(timeoutInMs:number) : Promise<any>
    {
        return new Promise(r=>
        {
            setTimeout(r, timeoutInMs);
        });
    }
}