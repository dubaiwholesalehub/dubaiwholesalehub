import { createClient } from "@/lib/supabase/server";


export async function getCategories(){

    const supabase = await createClient();


    const {data,error}= await supabase
        .from("categories")
        .select("*")
        .eq("is_active",true)
        .order("sort_order");


    if(error){
        throw error;
    }


    return data;
}