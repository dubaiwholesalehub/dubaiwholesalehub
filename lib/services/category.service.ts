import { getCategories } from "@/lib/repositories/category.repository";


export async function getHomepageCategories(){

    return getCategories();

}