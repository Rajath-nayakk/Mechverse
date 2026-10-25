using UnrealBuildTool;

public class Mechverse : ModuleRules
{
	public Mechverse(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
	
		PublicDependencyModuleNames.AddRange(new string[] { 
			"Core", 
			"CoreUObject", 
			"Engine", 
			"InputCore",
			"EnhancedInput",
			"UMG",
			"Slate",
			"SlateCore",
			"PhysicsCore"
		});

		PublicIncludePaths.AddRange(new string[] {
			ModuleDirectory
		});

		PrivateDependencyModuleNames.AddRange(new string[] {  });
	}
}
